#!/usr/bin/env python3
"""
Network Traffic Capture and Feature Extraction Module with Kafka Integration
"""

import time
import sys
import signal
import json
import numpy as np
import logging
from logging.handlers import RotatingFileHandler
import os
from collections import defaultdict
from scapy.all import sniff, IP, TCP, UDP, ICMP, IPv6, Raw
from scapy.layers import http
from scapy.layers.tls.all import *
from kafka import KafkaProducer
from kafka.errors import KafkaError
import argparse

# Constants
FLOW_TIMEOUT = 120  # Flow expiration timeout in seconds
MAX_FLOWS = 100000  # Maximum number of flows to track (prevent memory issues)

# Set up logging
def setup_logging(log_level=logging.INFO, log_file=None):
    """Configure logging"""
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    logger = logging.getLogger('network_sniffer')
    logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10*1024*1024, backupCount=5)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(logging.Formatter(log_format))
        logger.addHandler(file_handler)
    
    return logger

class Flow:
    """Represents a bidirectional network flow with comprehensive metrics"""
    
    def __init__(self, src_ip, dst_ip, src_port, dst_port, protocol, timestamp):
        # Flow identifier
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol
        
        # Timestamps
        self.start_time = timestamp
        self.last_seen = timestamp
        
        # Packet counts
        self.forward_packets = 0
        self.backward_packets = 0
        
        # Byte counts
        self.forward_bytes = 0
        self.backward_bytes = 0
        
        # Packet lengths
        self.fwd_packet_lengths = []
        self.bwd_packet_lengths = []
        
        # TCP flag counts
        self.syn_count = 0
        self.fin_count = 0
        self.rst_count = 0
        self.psh_count = 0
        self.ack_count = 0
        self.urg_count = 0
        self.cwr_count = 0
        self.ece_count = 0
        
        # Flow status
        self.is_complete = False

    def add_packet(self, pkt, timestamp, direction="forward"):
        """Add a packet to the flow and update statistics"""
        self.last_seen = timestamp
            
        if direction == "forward":
            self.forward_packets += 1
            pkt_len = len(pkt)
            self.forward_bytes += pkt_len
            self.fwd_packet_lengths.append(pkt_len)
            
            if TCP in pkt:
                flags = pkt[TCP].flags
                if flags & 0x02:  # SYN
                    self.syn_count += 1
                if flags & 0x01:  # FIN
                    self.fin_count += 1
                    if self.fin_count >= 2:
                        self.is_complete = True
                if flags & 0x04:  # RST
                    self.rst_count += 1
                    self.is_complete = True
                if flags & 0x08:  # PSH
                    self.psh_count += 1
                if flags & 0x10:  # ACK
                    self.ack_count += 1
                if flags & 0x20:  # URG
                    self.urg_count += 1
                if flags & 0x40:  # CWR
                    self.cwr_count += 1
                if flags & 0x80:  # ECE
                    self.ece_count += 1
                    
        else:  # backward
            self.backward_packets += 1
            pkt_len = len(pkt)
            self.backward_bytes += pkt_len
            self.bwd_packet_lengths.append(pkt_len)

    def is_expired(self, current_time):
        """Check if this flow has expired"""
        return (current_time - self.last_seen) > FLOW_TIMEOUT or self.is_complete

    def get_stats(self):
        """Generate comprehensive statistics for this flow"""
        flow_duration = (self.last_seen - self.start_time) if self.last_seen != self.start_time else 0.001
        
        # Calculate additional stats if we have packets
        fwd_packet_len_mean = np.mean(self.fwd_packet_lengths) if self.fwd_packet_lengths else 0
        bwd_packet_len_mean = np.mean(self.bwd_packet_lengths) if self.bwd_packet_lengths else 0
        
        stats = {
            'src_ip': self.src_ip,
            'dst_ip': self.dst_ip,
            'src_port': self.src_port,
            'dst_port': self.dst_port,
            'protocol': self.protocol,
            'flow_duration': flow_duration * 1000000,  # microseconds
            'total_fwd_packets': self.forward_packets,
            'total_bwd_packets': self.backward_packets,
            'total_packets': self.forward_packets + self.backward_packets,
            'total_fwd_bytes': self.forward_bytes,
            'total_bwd_bytes': self.backward_bytes,
            'fwd_packet_len_mean': fwd_packet_len_mean,
            'bwd_packet_len_mean': bwd_packet_len_mean,
            'flow_bytes_per_second': (self.forward_bytes + self.backward_bytes) / flow_duration if flow_duration > 0 else 0,
            'flow_packets_per_second': (self.forward_packets + self.backward_packets) / flow_duration if flow_duration > 0 else 0,
            'syn_flag_count': self.syn_count,
            'fin_flag_count': self.fin_count,
            'rst_flag_count': self.rst_count,
            'psh_flag_count': self.psh_count,
            'ack_flag_count': self.ack_count,
            'urg_flag_count': self.urg_count,
            'cwr_flag_count': self.cwr_count,
            'ece_flag_count': self.ece_count,
            'is_complete': self.is_complete,
            'timestamp': self.last_seen,
        }
        
        return stats

class NetworkSniffer:
    """Captures and analyzes network packets with Kafka integration"""
    
    def __init__(self, interface=None, kafka_params=None, logger=None):
        self.interface = interface
        self.kafka_params = kafka_params
        self.logger = logger or logging.getLogger('network_sniffer')
        self.flows = {}
        self.running = False
        self.display_interval = 5
        self.last_display = time.time()
        self.stats = {
            'packets_processed': 0,
            'flows_created': 0,
            'flows_expired': 0,
            'kafka_success': 0,
            'kafka_errors': 0
        }
        
        # Initialize Kafka producer with error handling
        self._init_kafka_producer()

    def _init_kafka_producer(self):
        """Initialize Kafka producer with retries"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=self.kafka_params['bootstrap_servers'],
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    acks='all',  # Wait for all replicas
                    retries=5,   # Retry on producer failure
                    max_in_flight_requests_per_connection=1,  # Limit concurrent requests
                    linger_ms=100  # Small batching delay for better throughput
                )
                self.logger.info(f"Successfully connected to Kafka brokers: {self.kafka_params['bootstrap_servers']}")
                return
            except Exception as e:
                retry_count += 1
                self.logger.error(f"Kafka connection error (attempt {retry_count}/{max_retries}): {e}")
                time.sleep(2)
        
        self.logger.critical("Failed to connect to Kafka after multiple attempts")
        sys.exit(1)

    def packet_handler(self, pkt):
        """Process each captured packet"""
        self.stats['packets_processed'] += 1
        
        flow_key = self.get_flow_key(pkt)
        if flow_key:
            flow = self.flows.get(flow_key)
            
            # Create new flow if needed
            if not flow:
                # Check if we've hit the max flows limit
                if len(self.flows) >= MAX_FLOWS:
                    self.logger.warning(f"Reached maximum flow limit ({MAX_FLOWS}), cleaning up oldest flows")
                    self._force_expire_oldest_flows(MAX_FLOWS // 10)  # Expire 10% of flows
                
                src_ip, dst_ip, src_port, dst_port, protocol = flow_key
                flow = Flow(src_ip, dst_ip, src_port, dst_port, protocol, time.time())
                self.flows[flow_key] = flow
                self.stats['flows_created'] += 1
                
                if self.stats['flows_created'] % 100 == 0:
                    self.logger.info(f"Created flow #{self.stats['flows_created']}: {src_ip}:{src_port} -> {dst_ip}:{dst_port} ({protocol})")
            
            flow.add_packet(pkt, time.time(), "forward" if IP in pkt and pkt[IP].src == flow.src_ip else "backward")
        
        # Update display and cleanup periodically
        current_time = time.time()
        if current_time - self.last_display > self.display_interval:
            self.display_stats()
            self.cleanup_flows(current_time)
            self.last_display = current_time

    def get_flow_key(self, pkt):
        """Generate a unique flow identifier from a packet"""
        try:
            if IP in pkt:
                ip_layer = pkt[IP]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst
                protocol = ip_layer.proto
            elif IPv6 in pkt:
                ip_layer = pkt[IPv6]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst
                protocol = ip_layer.nh  # next header
            else:
                return None  # Not an IP packet
                
            # For TCP/UDP, include port information
            if TCP in pkt:
                src_port = pkt[TCP].sport
                dst_port = pkt[TCP].dport
            elif UDP in pkt:
                src_port = pkt[UDP].sport
                dst_port = pkt[UDP].dport
            else:
                src_port = 0
                dst_port = 0
                
            # Create bidirectional flow key (lower IP/port first)
            if (src_ip < dst_ip) or (src_ip == dst_ip and src_port < dst_port):
                flow_key = (src_ip, dst_ip, src_port, dst_port, protocol)
            else:
                flow_key = (dst_ip, src_ip, dst_port, src_port, protocol)
                
            return flow_key
        except Exception as e:
            self.logger.error(f"Error generating flow key: {e}")
            return None

    def _force_expire_oldest_flows(self, count):
        """Force expire the oldest flows when hitting max flow limit"""
        if not self.flows:
            return
            
        # Sort flows by last_seen timestamp
        sorted_flows = sorted(
            self.flows.items(), 
            key=lambda x: x[1].last_seen
        )
        
        # Expire the oldest flows
        for i in range(min(count, len(sorted_flows))):
            key, flow = sorted_flows[i]
            flow_stats = flow.get_stats()
            self.send_to_kafka(flow_stats)
            del self.flows[key]
            self.stats['flows_expired'] += 1

    def cleanup_flows(self, current_time):
        """Remove expired flows and send to Kafka"""
        expired_keys = []
        for key, flow in list(self.flows.items()):
            if flow.is_expired(current_time):
                expired_keys.append(key)
                flow_stats = flow.get_stats()
                self.send_to_kafka(flow_stats)
                self.stats['flows_expired'] += 1

        for key in expired_keys:
            del self.flows[key]
            
        if expired_keys:
            self.logger.info(f"Cleaned up {len(expired_keys)} expired flows. Active flows: {len(self.flows)}")

    def send_to_kafka(self, flow_stats):
        """Send flow statistics to Kafka"""
        try:
            self.producer.send(
                self.kafka_params['topic'], 
                value=flow_stats
            ).add_callback(self._on_send_success).add_errback(self._on_send_error)
            
            # Don't logger.info every flow to avoid too much logging
            if self.stats['kafka_success'] % 100 == 0:
                self.logger.debug(f"Queued flow data for Kafka: {flow_stats['src_ip']}:{flow_stats['src_port']} -> {flow_stats['dst_ip']}:{flow_stats['dst_port']}")
        except Exception as e:
            self.stats['kafka_errors'] += 1
            self.logger.error(f"Error sending to Kafka: {e}")
    
    def _on_send_success(self, record_metadata):
        """Callback for successful Kafka send"""
        self.stats['kafka_success'] += 1
    
    def _on_send_error(self, excp):
        """Callback for failed Kafka send"""
        self.stats['kafka_errors'] += 1
        self.logger.error(f"Error sending to Kafka: {excp}")

    def display_stats(self):
        """Display current statistics"""
        self.logger.info(
            f"Stats: {self.stats['packets_processed']} packets, "
            f"{self.stats['flows_created']} flows created, "
            f"{self.stats['flows_expired']} flows expired, "
            f"{len(self.flows)} active flows, "
            f"{self.stats['kafka_success']} kafka msgs success, "
            f"{self.stats['kafka_errors']} kafka errors"
        )

    def start_capture(self, count=0):
        """Start capturing packets"""
        self.running = True
        
        self.logger.info(f"Starting packet capture on interface {self.interface}")
        self.logger.info(f"Publishing flow data to Kafka topic: {self.kafka_params['topic']}")
        
        # Set up signal handler for graceful exit
        def signal_handler(sig, frame):
            self.logger.info("\nStopping capture, processing remaining flows...")
            self.running = False
            self._process_remaining_flows()
            
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        try:
            # Start packet capture
            sniff(
                iface=self.interface,
                prn=self.packet_handler,
                count=count,
                store=0,  # Don't store packets in memory
                stop_filter=lambda x: not self.running
            )
        except Exception as e:
            self.logger.error(f"Error during packet capture: {e}")
        finally:
            self._process_remaining_flows()
            self.logger.info("Capture complete.")
    
    def _process_remaining_flows(self):
        """Process any remaining flows before shutdown"""
        if self.flows:
            self.logger.info(f"Processing {len(self.flows)} remaining flows before exit")
            for key, flow in list(self.flows.items()):
                flow_stats = flow.get_stats()
                self.send_to_kafka(flow_stats)
                self.stats['flows_expired'] += 1
            
            # Ensure all messages are sent
            self.producer.flush()
            self.logger.info("All flow data has been sent to Kafka")
            
            # Clear flows
            self.flows.clear()

def main():
    parser = argparse.ArgumentParser(description='Network Traffic Capture and Feature Extraction with Kafka Integration')
    parser.add_argument('-i', '--interface', required=True, help='Network interface to capture from')
    parser.add_argument('--kafka-brokers', required=True, help='Kafka bootstrap servers (comma separated)')
    parser.add_argument('--kafka-topic', required=True, help='Kafka topic to publish to')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                        help='Logging level')
    parser.add_argument('--log-file', help='Log to file (in addition to console)')
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = getattr(logging, args.log_level)
    logger = setup_logging(log_level=log_level, log_file=args.log_file)
    
    kafka_params = {
        'bootstrap_servers': args.kafka_brokers.split(','),
        'topic': args.kafka_topic
    }
    
    try:
        sniffer = NetworkSniffer(interface=args.interface, kafka_params=kafka_params, logger=logger)
        sniffer.start_capture()
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()