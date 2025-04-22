#!/usr/bin/env python3
"""
Kafka-PostgreSQL Integration for Network Flow Data
"""

import time
import json
import psycopg2
from psycopg2.extras import DictCursor
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
from concurrent.futures import ThreadPoolExecutor
import signal
import sys

class PostgresToKafka:
    def __init__(self, db_params, kafka_params):
        # Database connection
        self.db_params = db_params
        self.conn = None
        
        # Kafka configuration
        self.kafka_params = kafka_params
        self.producer = None
        self.consumer = None
        
        # Control flags
        self.running = False
        self.batch_size = 50  # Fetch from PostgreSQL
        self.send_size = 5    # Send to Kafka in smaller batches
        self.poll_interval = 5 # Seconds between checks for new data
        
    def connect(self):
        """Establish connections to both PostgreSQL and Kafka"""
        try:
            # PostgreSQL connection
            self.conn = psycopg2.connect(
                host=self.db_params['host'],
                port=self.db_params['port'],
                dbname=self.db_params['dbname'],
                user=self.db_params['user'],
                password=self.db_params['password']
            )
            
            # Kafka producer
            self.producer = KafkaProducer(
                bootstrap_servers=self.kafka_params['bootstrap_servers'],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks=self.kafka_params.get('acks', 'all'),
                retries=self.kafka_params.get('retries', 3)
            )
            
            print("Successfully connected to PostgreSQL and Kafka")
            return True
            
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def fetch_from_postgres(self, last_id=0):
        """Fetch a batch of records from PostgreSQL"""
        try:
            with self.conn.cursor(cursor_factory=DictCursor) as cursor:
                query = """
                SELECT id, flow_data FROM network_flows
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
                """
                cursor.execute(query, (last_id, self.batch_size))
                results = cursor.fetchall()
                return results
        except Exception as e:
            print(f"Error fetching from PostgreSQL: {e}")
            return []
    
    def process_batches(self):
        """Main processing loop that fetches from PG and sends to Kafka"""
        last_processed_id = 0
        
        while self.running:
            # Fetch batch from PostgreSQL
            records = self.fetch_from_postgres(last_processed_id)
            
            if not records:
                # No new data, sleep before checking again
                time.sleep(self.poll_interval)
                continue
                
            # Process in smaller batches for Kafka
            for i in range(0, len(records), self.send_size):
                batch = records[i:i + self.send_size]
                
                # Prepare batch for Kafka
                messages = []
                for record in batch:
                    try:
                        # Convert to dict and add metadata
                        message = {
                            'postgres_id': record['id'],
                            'flow_data': record['flow_data'],
                            'timestamp': time.time()
                        }
                        messages.append(message)
                    except Exception as e:
                        print(f"Error processing record {record.get('id')}: {e}")
                
                # Send to Kafka
                if messages:
                    try:
                        future = self.producer.send(
                            self.kafka_params['topic'],
                            value={'batch': messages}
                        )
                        # Optional: Wait for acknowledgment
                        # future.get(timeout=10)
                        
                        print(f"Sent batch of {len(messages)} messages to Kafka")
                        last_processed_id = max(msg['postgres_id'] for msg in messages)
                    except KafkaError as e:
                        print(f"Error sending to Kafka: {e}")
                        # Implement retry logic here if needed
            
            # Small delay between batches
            time.sleep(1)
    
    def start(self):
        """Start the processing"""
        if not self.connect():
            return False
            
        self.running = True
        print("Starting PostgreSQL to Kafka pipeline...")
        
        # Set up signal handler for graceful shutdown
        def signal_handler(sig, frame):
            print("\nShutting down gracefully...")
            self.running = False
            
        signal.signal(signal.SIGINT, signal_handler)
        
        # Start processing in a thread pool
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.submit(self.process_batches)
            
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        
        self.close()
        return True
    
    def close(self):
        """Clean up resources"""
        print("Closing connections...")
        if self.producer:
            self.producer.flush()
            self.producer.close()
        if self.conn and not self.conn.closed:
            self.conn.close()
        print("Cleanup complete")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='PostgreSQL to Kafka Pipeline for Network Flow Data')
    
    # PostgreSQL arguments
    parser.add_argument('--db-host', required=True, help='PostgreSQL host')
    parser.add_argument('--db-port', type=int, default=5432, help='PostgreSQL port')
    parser.add_argument('--db-name', required=True, help='PostgreSQL database name')
    parser.add_argument('--db-user', required=True, help='PostgreSQL user')
    parser.add_argument('--db-password', required=True, help='PostgreSQL password')
    
    # Kafka arguments
    parser.add_argument('--kafka-brokers', required=True, help='Kafka bootstrap servers (comma separated)')
    parser.add_argument('--kafka-topic', required=True, help='Kafka topic to publish to')
    parser.add_argument('--kafka-acks', default='all', help='Kafka producer acknowledgment setting')
    parser.add_argument('--kafka-retries', type=int, default=3, help='Kafka producer retry count')
    
    args = parser.parse_args()
    
    db_params = {
        'host': args.db_host,
        'port': args.db_port,
        'dbname': args.db_name,
        'user': args.db_user,
        'password': args.db_password
    }
    
    kafka_params = {
        'bootstrap_servers': args.kafka_brokers.split(','),
        'topic': args.kafka_topic,
        'acks': args.kafka_acks,
        'retries': args.kafka_retries
    }
    
    processor = PostgresToKafka(db_params, kafka_params)
    processor.start()

if __name__ == "__main__":
    main()