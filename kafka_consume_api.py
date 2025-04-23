#!/usr/bin/env python3
"""
FastAPI Consumer for Real-time Network Flow Data
"""

from fastapi import FastAPI, HTTPException
from kafka import KafkaConsumer
from pydantic import BaseModel
import json
import threading
from collections import deque
import logging
import signal
import sys
import time
from contextlib import asynccontextmanager
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('api_consumer')

# Global storage for latest flows (last 1000 flows)
RECENT_FLOWS = deque(maxlen=1000)
KAFKA_CONSUMER_RUNNING = True

class NetworkFlow(BaseModel):
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: int
    flow_duration: float
    total_packets: int
    total_bytes: int
    timestamp: float

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events"""
    kafka_thread = threading.Thread(
        target=start_kafka_consumer,
        args=(['localhost:9092'], 'network-flows'),
        daemon=True
    )
    kafka_thread.start()
    logger.info("Started Kafka consumer thread")

    yield  # App is running

    global KAFKA_CONSUMER_RUNNING
    KAFKA_CONSUMER_RUNNING = False
    logger.info("Shutting down Kafka consumer")

app = FastAPI(
    title="Network Flow API",
    description="Real-time network flow monitoring API",
    lifespan=lifespan
)

def start_kafka_consumer(bootstrap_servers, topic):
    """Kafka consumer thread function"""
    try:
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset='latest',
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            consumer_timeout_ms=1000
        )
        logger.info(f"Connected to Kafka: {bootstrap_servers}, topic: {topic}")
    except Exception as e:
        logger.error(f"Kafka connection failed: {e}")
        return

    global KAFKA_CONSUMER_RUNNING
    while KAFKA_CONSUMER_RUNNING:
        try:
            for message in consumer:
                if not KAFKA_CONSUMER_RUNNING:
                    break
                flow_data = message.value
                RECENT_FLOWS.append(flow_data)
                logger.debug(f"Received flow: {flow_data.get('src_ip')} → {flow_data.get('dst_ip')}")
        except Exception as e:
            logger.error(f"Kafka consumer error: {e}")
            time.sleep(1)

    consumer.close()
    logger.info("Kafka consumer stopped")

def enrich_flow(flow: dict) -> dict:
    """Add total_bytes field to a flow dict"""
    return {
        "src_ip": flow["src_ip"],
        "dst_ip": flow["dst_ip"],
        "src_port": flow["src_port"],
        "dst_port": flow["dst_port"],
        "protocol": flow["protocol"],
        "flow_duration": flow["flow_duration"],
        "total_packets": flow["total_packets"],
        "timestamp": flow["timestamp"],
        "total_bytes": flow.get("total_fwd_bytes", 0) + flow.get("total_bwd_bytes", 0)
    }

@app.get("/flows", response_model=list[NetworkFlow], summary="Get recent flows")
async def get_recent_flows(limit: int = 100):
    """Get list of recent network flows"""
    if not RECENT_FLOWS:
        raise HTTPException(status_code=404, detail="No flows available")
    return [enrich_flow(f) for f in list(RECENT_FLOWS)[-limit:]]

@app.get("/flows/latest", response_model=NetworkFlow, summary="Get latest flow")
async def get_latest_flow():
    """Get the most recent network flow"""
    if not RECENT_FLOWS:
        raise HTTPException(status_code=404, detail="No flows available")
    return enrich_flow(RECENT_FLOWS[-1])

@app.get("/flows/search", summary="Search flows by criteria")
async def search_flows(
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
    protocol: Optional[int] = None
):
    """Search flows by source/destination IP or protocol"""
    results = []
    for flow in RECENT_FLOWS:
        if src_ip and flow.get('src_ip') != src_ip:
            continue
        if dst_ip and flow.get('dst_ip') != dst_ip:
            continue
        if protocol is not None and flow.get('protocol') != protocol:
            continue
        results.append(enrich_flow(flow))

    if not results:
        raise HTTPException(status_code=404, detail="No matching flows found")
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
