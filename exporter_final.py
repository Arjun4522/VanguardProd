#!/usr/bin/env python3
import pandas as pd
import numpy as np
import joblib
import time
from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP
from collections import defaultdict
from prometheus_client import start_http_server, Gauge, Counter, Summary
import threading
import warnings
import geoip2.database

warnings.filterwarnings("ignore")

# === Load Model ===
try:
    model_data = joblib.load('model2.pkl')
    pipeline = model_data['model']
    feature_cols = model_data['metadata']['features']
    print("✅ Model loaded successfully")
    print(f"Model features: {feature_cols}")
except FileNotFoundError:
    raise SystemExit("❌ Model file not found. Train the model first.")

# === Load GeoIP DB ===
try:
    geo_reader = geoip2.database.Reader('GeoLite2-City.mmdb')
    print("🌍 GeoIP database loaded")
except Exception as e:
    raise SystemExit(f"❌ Failed to load GeoIP DB: {e}")

# === Flow Tracker ===
flow_tracker = defaultdict(lambda: {
    'pktcount': 0,
    'bytecount': 0,
    'timestamps': [],
    'start_time': time.time(),
    'predicted': False
})

# === Constants ===
FLOW_TIMEOUT = 60
MIN_PACKETS = 5
ANOMALY_THRESHOLD = 0.3

# === Prometheus Metrics ===
prediction_metric = Gauge(
    'network_flow_prediction', 'Anomaly score per flow',
    [
        'src_ip', 'dst_ip', 'src_port', 'dst_port', 'protocol',
        'src_country', 'src_lat', 'src_lon',
        'dst_country', 'dst_lat', 'dst_lon'
    ]
)

prediction_total = Counter('model_prediction_total', 'Total number of predictions made')
anomaly_total = Counter('model_anomaly_total', 'Total anomalies detected')
last_prediction_proba = Gauge('model_last_prediction_proba', 'Probability of last prediction')
prediction_latency = Summary('model_prediction_latency_seconds', 'Prediction latency in seconds')

network_flow_total = Counter('network_flow_total', 'Total number of unique flows')
network_packet_total = Counter('network_packet_total', 'Total number of packets processed')
network_bytes_total = Counter('network_bytes_total', 'Total bytes processed')

# === GeoIP Helper ===
def get_geo_info(ip):
    try:
        geo = geo_reader.city(ip)
        return {
            'country': geo.country.name or 'Unknown',
            'latitude': str(geo.location.latitude),
            'longitude': str(geo.location.longitude)
        }
    except Exception:
        return {
            'country': 'Unknown',
            'latitude': '0',
            'longitude': '0'
        }

# === Flow Helpers ===
def get_flow_key(packet):
    if IP in packet:
        proto = packet[IP].proto
        src = packet[IP].src
        dst = packet[IP].dst
        sport = packet[TCP].sport if TCP in packet else (packet[UDP].sport if UDP in packet else 0)
        dport = packet[TCP].dport if TCP in packet else (packet[UDP].dport if UDP in packet else 0)
        return (src, dst, sport, dport, proto)
    return None

def calculate_flow_features(flow):
    duration = time.time() - flow['start_time']
    duration = duration if duration > 0 else 0.001
    features = {
        'pktcount': flow['pktcount'],
        'bytecount': flow['bytecount'],
        'pktperflow': flow['pktcount'] / duration,
        'byteperflow': flow['bytecount'] / duration
    }
    if len(flow['timestamps']) > 1:
        intervals = np.diff(flow['timestamps'])
        features['interarrival_mean'] = float(np.mean(intervals))
        features['interarrival_std'] = float(np.std(intervals))
    else:
        features['interarrival_mean'] = 0
        features['interarrival_std'] = 0
    return features

@prediction_latency.time()
def predict_flow(flow_features):
    try:
        X = pd.DataFrame([flow_features], columns=feature_cols)
        proba = pipeline.predict_proba(X)[0][1]
        prediction = 1 if proba >= ANOMALY_THRESHOLD else 0
        return prediction, proba
    except Exception as e:
        print(f"Prediction error: {e}")
        return 0, 0.0

def export_to_prometheus(flow_key, proba, prediction):
    src_geo = get_geo_info(flow_key[0])
    dst_geo = get_geo_info(flow_key[1])

    prediction_metric.labels(
        src_ip=flow_key[0],
        dst_ip=flow_key[1],
        src_port=str(flow_key[2]),
        dst_port=str(flow_key[3]),
        protocol=str(flow_key[4]),
        src_country=src_geo['country'],
        src_lat=src_geo['latitude'],
        src_lon=src_geo['longitude'],
        dst_country=dst_geo['country'],
        dst_lat=dst_geo['latitude'],
        dst_lon=dst_geo['longitude']
    ).set(proba)

    last_prediction_proba.set(proba)
    prediction_total.inc()
    if prediction == 1:
        anomaly_total.inc()

def packet_handler(packet):
    flow_key = get_flow_key(packet)
    if not flow_key:
        return

    flow = flow_tracker[flow_key]
    flow['pktcount'] += 1
    flow['bytecount'] += len(packet)
    flow['timestamps'].append(time.time())
    network_packet_total.inc()
    network_bytes_total.inc(len(packet))

    if flow['pktcount'] >= MIN_PACKETS and not flow['predicted']:
        flow['predicted'] = True
        features = calculate_flow_features(flow)
        prediction, proba = predict_flow(features)
        network_flow_total.inc()
        export_to_prometheus(flow_key, proba, prediction)

        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n⏰ {current_time}")
        print(f"🔍 Flow: {flow_key[0]}:{flow_key[2]} → {flow_key[1]}:{flow_key[3]} (Proto: {flow_key[4]})")
        
        src_geo = get_geo_info(flow_key[0])
        dst_geo = get_geo_info(flow_key[1])

        print(f"📊 Features: {features}")
        print(f"🌍 Geolocation:")
        print(f"   - SRC: {flow_key[0]} | Country: {src_geo['country']} | Lat: {src_geo['latitude']} | Lon: {src_geo['longitude']}")
        print(f"   - DST: {flow_key[1]} | Country: {dst_geo['country']} | Lat: {dst_geo['latitude']} | Lon: {dst_geo['longitude']}")
        print(f"🚀 Proba: {proba:.2f} | Prediction: {'ANOMALY' if prediction else 'Normal'}")

        print(f"📈 Totals: Flows={network_flow_total._value.get()} | Packets={network_packet_total._value.get()} | Bytes={network_bytes_total._value.get()}")
        print(f"⚠️ Anomalies: {anomaly_total._value.get()} / {prediction_total._value.get()} predictions")

def cleanup_expired_flows():
    while True:
        now = time.time()
        expired = [k for k, v in flow_tracker.items() if now - v['timestamps'][-1] > FLOW_TIMEOUT]
        for k in expired:
            del flow_tracker[k]
        time.sleep(FLOW_TIMEOUT / 2)

# === Main ===
def main():
    print("\n🚀 Starting Network Intrusion Detection System with GeoIP")
    print(f"🔧 Configuration: Min packets={MIN_PACKETS}, Threshold={ANOMALY_THRESHOLD}")
    print("📡 Prometheus Exporter running on port 8000")
    print("🛑 Press Ctrl+C to stop\n")

    start_http_server(8000)
    threading.Thread(target=cleanup_expired_flows, daemon=True).start()

    try:
        sniff(prn=packet_handler, store=0)
    except KeyboardInterrupt:
        print("\n🛑 IDS stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
