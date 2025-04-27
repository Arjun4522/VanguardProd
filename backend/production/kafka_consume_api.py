#!/usr/bin/env python3
"""
FastAPI Consumer with Async Kafka & WebSocket
"""
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
from aiokafka import AIOKafkaConsumer
from pydantic import BaseModel
import json
import asyncio
from collections import deque
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

# ----------------------
# Utility Functions First
# ----------------------
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

# ----------------------
# Core Application Setup
# ----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('api_consumer')

RECENT_FLOWS = deque(maxlen=1000)

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

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

# ----------------------
# Application Lifespan
# ----------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(consume_kafka_messages())
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Kafka Consumer
# ----------------------
async def consume_kafka_messages():
    try:
        consumer = AIOKafkaConsumer(
            'network-flows',
            bootstrap_servers='127.0.0.1:9092',
            auto_offset_reset='latest',
            max_poll_records=100,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        await consumer.start()
        logger.info("Kafka consumer started")

        async for message in consumer:
            flow_data = message.value
            RECENT_FLOWS.append(flow_data)
            await manager.broadcast(json.dumps(flow_data))  # Send the flow data to all WebSocket clients
            logger.info(f"Stored flow: {flow_data.get('src_ip')}")

        await consumer.stop()
    except Exception as e:
        logger.error(f"Kafka failure: {e}")

# ----------------------
# WebSocket Endpoint
# ----------------------
@app.websocket("/flows/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ----------------------
# HTTP Endpoints
# ----------------------
@app.get("/flows", response_model=List[NetworkFlow])
async def get_recent_flows(limit: int = 100):
    if not RECENT_FLOWS:
        raise HTTPException(404, "No flows available")
    return [enrich_flow(f) for f in list(RECENT_FLOWS)[-limit:]]

@app.get("/flows/latest", response_model=NetworkFlow)
async def get_latest_flow():
    if not RECENT_FLOWS:
        raise HTTPException(404, "No flows available")
    return enrich_flow(RECENT_FLOWS[-1])

@app.get("/flows/search")
async def search_flows(
    src_ip: Optional[str] = None,
    dst_ip: Optional[str] = None,
    protocol: Optional[int] = None
):
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
        raise HTTPException(404, "No matching flows found")
    return results

@app.get("/geoip/{ip_address}")
async def get_geoip(ip_address: str):
    # Add your geo-IP service call here
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://ipapi.co/{ip_address}/json/")
        print(response)
        print("hi")
        return response.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
