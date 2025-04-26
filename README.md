# VanguardProd

Real-time Kafka-based network flow capture, storage, and monitoring stack.

---

## Project Setup

### 1. Clone Repository

```bash
git clone git@github.com:Arjun4522/VanguardProd.git
cd VanguardProd
```
### 2. Create and Activate Virtual Environment

```bash
# Create virtual environment
python3 -m venv vanguard_env

# Activate environment
source vanguard_env/bin/activate
```
## Backend Setup

### 3. Install Dependencies
```bash
pip install -r backend/production/requirements.txt
```
### 4. Start Kafka and Zookeeper
```bash
# Start Zookeeper server
cd backend/production/kafka_2.13-3.6.1
bin/zookeeper-server-start.sh config/zookeeper.properties

# In a new terminal (keep Zookeeper running)
bin/kafka-server-start.sh config/server.properties
```
### 5. Start Kafka Producers and Consumers
#### 5.1 Capture and Produce Network Flows
```bash
# Still inside vanguard_env
sudo python3 backend/production/kafka_produce_capture.py -i wlo1 --kafka-brokers "localhost:9092" --kafka-topic "network-flows" --log-level INFO
```
#### 5.2 Store into PostgreSQL
```bash
sudo python3 backend/production/kafka_consume_db.py \
  --db-host localhost \
  --db-port 5432 \
  --db-name netflows \
  --db-user network_admin \
  --db-password securepassword123 \
  --kafka-brokers localhost:9092 \
  --kafka-topic network-flows \
  --log-level INFO
```
#### 5.3 Start API Server (FastAPI + WebSocket)
```bash
uvicorn kafka_consume_api:app --reload --ws websockets
```
#### 5.4 # Run RedisTimeSeries in Docker
```bash
docker run -d --name redis-ts -p 6379:6379 redislabs/redistimeseries

# Start Redis consumer
python3 backend/production/kafka_consumer_redis.py \
  --redis-host localhost \
  --redis-port 6379 \
  --kafka-brokers localhost:9092 \
  --kafka-topic network-flows \
  --log-level INFO
```

### 6. Kafka Console Consumer (Optional for Debugging)
```bash
cd backend/production/kafka_2.13-3.6.1
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic network-flows --from-beginning
```

## Frontend Setup

### 1. Navigate to the frontend directory
```bash
cd ids-dashboard
```
### 2. Install Frontend Dependencies
```bash
npm install
```
### 3. 3. Run the Development Server
```bash
npm run dev
```

