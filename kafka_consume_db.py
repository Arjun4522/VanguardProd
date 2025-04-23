#!/usr/bin/env python3
"""
Kafka Consumer for PostgreSQL Integration
"""

import json
import psycopg2
import psycopg2.extras
import logging
from logging.handlers import RotatingFileHandler
import time
import sys
import signal
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import argparse

# Set up logging
def setup_logging(log_level=logging.INFO, log_file=None):
    """Configure logging"""
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    logger = logging.getLogger('postgres_consumer')
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

class PostgresConsumer:
    def __init__(self, db_params, kafka_params, logger=None):
        self.db_params = db_params
        self.kafka_params = kafka_params
        self.logger = logger or logging.getLogger('postgres_consumer')
        self.conn = None
        self.cur = None
        self.running = True
        self.stats = {
            'messages_consumed': 0,
            'db_inserts_success': 0,
            'db_inserts_failed': 0,
            'last_display': time.time(),
            'display_interval': 5
        }
        
        # Connect to PostgreSQL
        self.connect_to_postgres()
        
        # Create necessary tables if they don't exist
        self.setup_database()
        
        # Create Kafka consumer
        self._init_kafka_consumer()

    def connect_to_postgres(self):
        """Establish connection to PostgreSQL with retry logic"""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.conn = psycopg2.connect(
                    host=self.db_params['host'],
                    port=self.db_params['port'],
                    dbname=self.db_params['dbname'],
                    user=self.db_params['user'],
                    password=self.db_params['password']
                )
                # Use server-side cursor for better performance
                self.cur = self.conn.cursor()
                self.logger.info("Successfully connected to PostgreSQL")
                return
            except psycopg2.Error as e:
                retry_count += 1
                self.logger.error(f"Database connection error (attempt {retry_count}/{max_retries}): {e}")
                time.sleep(2)
        
        self.logger.critical("Failed to connect to PostgreSQL after multiple attempts")
        sys.exit(1)

    def setup_database(self):
        """Create necessary database tables if they don't exist"""
        try:
            # Create a table for raw flow data (JSON)
            self.cur.execute("""
                CREATE TABLE IF NOT EXISTS network_flows (
                    id SERIAL PRIMARY KEY,
                    flow_data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create a more structured table for better querying
            self.cur.execute("""
                CREATE TABLE IF NOT EXISTS flow_metrics (
                    id SERIAL PRIMARY KEY,
                    src_ip VARCHAR(45) NOT NULL,
                    dst_ip VARCHAR(45) NOT NULL,
                    src_port INTEGER NOT NULL,
                    dst_port INTEGER NOT NULL,
                    protocol INTEGER NOT NULL,
                    flow_duration BIGINT,
                    total_packets INTEGER,
                    total_bytes BIGINT,
                    timestamp TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create indexes for better query performance
            self.cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_flows_src_ip ON flow_metrics(src_ip);
                CREATE INDEX IF NOT EXISTS idx_flows_dst_ip ON flow_metrics(dst_ip);
                CREATE INDEX IF NOT EXISTS idx_flows_protocol ON flow_metrics(protocol);
                CREATE INDEX IF NOT EXISTS idx_flows_timestamp ON flow_metrics(timestamp);
            """)
            
            self.conn.commit()
            self.logger.info("Database tables and indexes have been set up")
        except psycopg2.Error as e:
            self.logger.error(f"Error setting up database: {e}")
            self.conn.rollback()

    def _init_kafka_consumer(self):
        """Initialize Kafka consumer with error handling"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.consumer = KafkaConsumer(
                    self.kafka_params['topic'],
                    bootstrap_servers=self.kafka_params['bootstrap_servers'],
                    auto_offset_reset='earliest',
                    enable_auto_commit=True,
                    group_id='postgres-consumer-group',
                    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                    session_timeout_ms=30000,
                    max_poll_interval_ms=300000
                )
                self.logger.info(f"Successfully connected to Kafka brokers: {self.kafka_params['bootstrap_servers']}")
                return
            except Exception as e:
                retry_count += 1
                self.logger.error(f"Kafka connection error (attempt {retry_count}/{max_retries}): {e}")
                time.sleep(2)
        
        self.logger.critical("Failed to connect to Kafka after multiple attempts")
        sys.exit(1)

    def insert_flow(self, flow_data):
        """Insert flow data into PostgreSQL"""
        try:
            # Insert raw JSON data
            self.cur.execute(
                "INSERT INTO network_flows (flow_data) VALUES (%s) RETURNING id",
                (json.dumps(flow_data),)
            )
            flow_id = self.cur.fetchone()[0]
            
            # Insert structured metrics for better querying
            timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(flow_data.get('timestamp', time.time())))
            
            self.cur.execute("""
                INSERT INTO flow_metrics (
                    src_ip, dst_ip, src_port, dst_port, protocol,
                    flow_duration, total_packets, total_bytes, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                flow_data.get('src_ip'),
                flow_data.get('dst_ip'),
                flow_data.get('src_port'),
                flow_data.get('dst_port'),
                flow_data.get('protocol'),
                flow_data.get('flow_duration'),
                flow_data.get('total_fwd_packets', 0) + flow_data.get('total_bwd_packets', 0),
                flow_data.get('total_fwd_bytes', 0) + flow_data.get('total_bwd_bytes', 0),
                timestamp
            ))
            
            self.conn.commit()
            self.stats['db_inserts_success'] += 1
            
            # Only log every 100 inserts to avoid too much logging
            if self.stats['db_inserts_success'] % 100 == 0:
                self.logger.debug(f"Inserted flow data (ID: {flow_id}): {flow_data['src_ip']}:{flow_data['src_port']} -> {flow_data['dst_ip']}:{flow_data['dst_port']}")
        except psycopg2.Error as e:
            self.stats['db_inserts_failed'] += 1
            self.logger.error(f"Error inserting flow data: {e}")
            self.conn.rollback()
            
            # Check if connection is still alive
            self._check_connection()

    def _check_connection(self):
        """Check if database connection is still alive and reconnect if needed"""
        try:
            # Simple query to check connection
            self.cur.execute("SELECT 1")
        except psycopg2.Error:
            self.logger.warning("Database connection lost, attempting to reconnect...")
            self.close()
            self.connect_to_postgres()

    def display_stats(self):
        """Display current statistics"""
        current_time = time.time()
        if current_time - self.stats['last_display'] > self.stats['display_interval']:
            self.logger.info(
                f"Stats: {self.stats['messages_consumed']} messages consumed, "
                f"{self.stats['db_inserts_success']} inserts success, "
                f"{self.stats['db_inserts_failed']} inserts failed"
            )
            self.stats['last_display'] = current_time

    def consume(self):
        """Consume messages from Kafka and insert into PostgreSQL"""
        self.logger.info(f"Starting Kafka consumer on topic: {self.kafka_params['topic']}")
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            while self.running:
                try:
                    # Poll with timeout to allow checking the running flag
                    message_batch = self.consumer.poll(timeout_ms=1000)
                    
                    if not message_batch:
                        continue
                        
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            if not self.running:
                                break
                                
                            flow_data = message.value
                            self.stats['messages_consumed'] += 1
                            self.insert_flow(flow_data)
                            self.display_stats()
                            
                except KafkaError as e:
                    self.logger.error(f"Kafka error during message consumption: {e}")
                    time.sleep(1)  # Wait before retry
                    
        except Exception as e:
            self.logger.error(f"Unexpected error in consumer: {e}")
        finally:
            self.logger.info("Shutting down consumer...")
            self.close()

    def _signal_handler(self, sig, frame):
        """Handle termination signals"""
        self.logger.info("Received shutdown signal, closing connections...")
        self.running = False

    def close(self):
        """Close database and Kafka connections"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        
        # Close Kafka consumer
        if hasattr(self, 'consumer'):
            self.consumer.close()
            
        self.logger.info("All connections closed. Consumer shutdown complete.")

def main():
    parser = argparse.ArgumentParser(description='Kafka Consumer for PostgreSQL Integration')
    parser.add_argument('--db-host', required=True, help='PostgreSQL host')
    parser.add_argument('--db-port', type=int, default=5432, help='PostgreSQL port')
    parser.add_argument('--db-name', required=True, help='PostgreSQL database name')
    parser.add_argument('--db-user', required=True, help='PostgreSQL user')
    parser.add_argument('--db-password', required=True, help='PostgreSQL password')
    parser.add_argument('--kafka-brokers', required=True, help='Kafka bootstrap servers (comma separated)')
    parser.add_argument('--kafka-topic', required=True, help='Kafka topic to consume from')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                        help='Logging level')
    parser.add_argument('--log-file', help='Log to file (in addition to console)')

    args = parser.parse_args()

    # Setup logging
    log_level = getattr(logging, args.log_level)
    logger = setup_logging(log_level=log_level, log_file=args.log_file)

    db_params = {
        'host': args.db_host,
        'port': args.db_port,
        'dbname': args.db_name,
        'user': args.db_user,
        'password': args.db_password
    }

    kafka_params = {
        'bootstrap_servers': args.kafka_brokers.split(','),
        'topic': args.kafka_topic
    }

    try:
        consumer = PostgresConsumer(db_params, kafka_params, logger=logger)
        consumer.consume()
    except Exception as e:
        logger.critical(f"Fatal error in consumer: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()