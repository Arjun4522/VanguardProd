#!/usr/bin/env python3
"""
Kafka Consumer for Redis TimeSeries Integration
"""

import json
import logging
from logging.handlers import RotatingFileHandler
import time
import sys
import signal
import argparse
from datetime import datetime
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import redis
from redis.exceptions import RedisError

# Redis TimeSeries commands are implemented through the client
# First, make sure to install: pip install redis-py-cluster==2.1.3 redis==4.5.4

# Set up logging
def setup_logging(log_level=logging.INFO, log_file=None):
    """Configure logging"""
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    logger = logging.getLogger('redis_timeseries_consumer')
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

class RedisTimeSeriesConsumer:
    def __init__(self, redis_params, kafka_params, logger=None):
        self.redis_params = redis_params
        self.kafka_params = kafka_params
        self.logger = logger or logging.getLogger('redis_timeseries_consumer')
        self.running = True
        self.stats = {
            'messages_consumed': 0,
            'timeseries_inserts_success': 0,
            'timeseries_inserts_failed': 0,
            'last_display': time.time(),
            'display_interval': 5
        }
        
        # Define metrics to track
        self.metrics = [
            # Flow volume metrics
            {'name': 'flow_bytes_total', 'labels': ['src_ip', 'dst_ip', 'protocol']},
            {'name': 'flow_packets_total', 'labels': ['src_ip', 'dst_ip', 'protocol']},
            {'name': 'flow_duration_ms', 'labels': ['src_ip', 'dst_ip', 'protocol']},
            
            # Protocol-specific metrics
            {'name': 'protocol_bytes', 'labels': ['protocol']},
            {'name': 'protocol_flows', 'labels': ['protocol']},
            
            # IP-specific metrics
            {'name': 'src_ip_bytes_out', 'labels': ['src_ip']},
            {'name': 'dst_ip_bytes_in', 'labels': ['dst_ip']},
            
            # Port-specific metrics
            {'name': 'src_port_flows', 'labels': ['src_port']},
            {'name': 'dst_port_flows', 'labels': ['dst_port']},
            
            # TCP flag metrics
            {'name': 'tcp_syn_count', 'labels': ['src_ip']},
            {'name': 'tcp_fin_count', 'labels': ['src_ip']},
            {'name': 'tcp_rst_count', 'labels': ['src_ip']},
        ]
        
        # Connect to Redis
        self.connect_to_redis()
        
        # Create Kafka consumer
        self._init_kafka_consumer()

    def connect_to_redis(self):
        """Establish connection to Redis with retry logic"""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.redis_client = redis.Redis(
                    host=self.redis_params['host'],
                    port=self.redis_params['port'],
                    password=self.redis_params.get('password'),
                    decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                self.logger.info("Successfully connected to Redis")
                
                # Create required TimeSeries keys if they don't exist
                self._create_timeseries_keys()
                return
            except RedisError as e:
                retry_count += 1
                self.logger.error(f"Redis connection error (attempt {retry_count}/{max_retries}): {e}")
                time.sleep(2)
        
        self.logger.critical("Failed to connect to Redis after multiple attempts")
        sys.exit(1)

    def _create_timeseries_keys(self):
        """Create TimeSeries keys with appropriate retention and labels"""
        try:
            # Create a pipeline for bulk operations
            pipe = self.redis_client.pipeline()
            
            # Common retention periods
            # 1 hour with 1-second resolution
            hour_retention = 3600 * 1000
            # 1 day with 10-second resolution
            day_retention = 24 * 3600 * 1000
            # 1 week with 1-minute resolution
            week_retention = 7 * 24 * 3600 * 1000
            
            # Create TimeSeries keys for each metric (creates only if doesn't exist)
            for metric in self.metrics:
                metric_name = metric['name']
                labels = metric['labels']
                
                # Check if key exists
                exists = bool(self.redis_client.exists(f"ts:{metric_name}"))
                if not exists:
                    # Create main timeseries for raw data with 1-hour retention
                    self._ts_create(pipe, f"ts:{metric_name}", hour_retention, labels=labels)
                    
                    # Create downsampled timeseries for longer retention
                    # 10-second aggregation for day-level view
                    self._ts_create(pipe, f"ts:{metric_name}:10sec", day_retention, labels=labels)
                    # 1-minute aggregation for week-level view
                    self._ts_create(pipe, f"ts:{metric_name}:1min", week_retention, labels=labels)
                    
                    # Create compaction rules (downsampling)
                    self._ts_createrule(pipe, f"ts:{metric_name}", f"ts:{metric_name}:10sec", "avg", 10000)  # 10 sec
                    self._ts_createrule(pipe, f"ts:{metric_name}", f"ts:{metric_name}:1min", "avg", 60000)   # 1 min
            
            # Execute all commands
            pipe.execute()
            self.logger.info("TimeSeries keys have been created")
            
        except RedisError as e:
            self.logger.error(f"Error setting up TimeSeries keys: {e}")

    def _ts_create(self, pipe, key, retention=0, labels=None):
        """Create a TimeSeries key with optional retention and labels"""
        cmd_args = ['TS.CREATE', key]
        if retention > 0:
            cmd_args.extend(['RETENTION', retention])
        if labels:
            for label in labels:
                cmd_args.extend(['LABELS', label, ''])  # Empty value placeholder
        pipe.execute_command(*cmd_args)

    def _ts_createrule(self, pipe, source_key, dest_key, aggregation_type, bucket_size_ms):
        """Create a compaction rule for downsampling TimeSeries data"""
        pipe.execute_command('TS.CREATERULE', source_key, dest_key, 
                            'AGGREGATION', aggregation_type, bucket_size_ms)

    def _init_kafka_consumer(self):
        """Initialize Kafka consumer with error handling"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.consumer = KafkaConsumer(
                    self.kafka_params['topic'],
                    bootstrap_servers=self.kafka_params['bootstrap_servers'],
                    auto_offset_reset='latest',  # Start with latest messages
                    enable_auto_commit=True,
                    group_id='redis-timeseries-consumer-group',
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

    def _process_flow_data(self, flow_data):
        """Process flow data and add to Redis TimeSeries"""
        try:
            # Extract timestamps (convert to milliseconds)
            timestamp = int(flow_data.get('timestamp', time.time()) * 1000)
            
            # Use Redis pipeline for bulk operations
            pipe = self.redis_client.pipeline()
            
            # Process flow volume metrics
            self._add_timeseries_point(pipe, 'flow_bytes_total', 
                                      float(flow_data.get('total_fwd_bytes', 0) + flow_data.get('total_bwd_bytes', 0)),
                                      timestamp, 
                                      {'src_ip': flow_data.get('src_ip'), 
                                       'dst_ip': flow_data.get('dst_ip'),
                                       'protocol': str(flow_data.get('protocol'))})
            
            self._add_timeseries_point(pipe, 'flow_packets_total', 
                                      float(flow_data.get('total_fwd_packets', 0) + flow_data.get('total_bwd_packets', 0)),
                                      timestamp, 
                                      {'src_ip': flow_data.get('src_ip'), 
                                       'dst_ip': flow_data.get('dst_ip'),
                                       'protocol': str(flow_data.get('protocol'))})
            
            self._add_timeseries_point(pipe, 'flow_duration_ms', 
                                      float(flow_data.get('flow_duration', 0)),
                                      timestamp, 
                                      {'src_ip': flow_data.get('src_ip'), 
                                       'dst_ip': flow_data.get('dst_ip'),
                                       'protocol': str(flow_data.get('protocol'))})
            
            # Process protocol metrics
            protocol = str(flow_data.get('protocol'))
            self._add_timeseries_point(pipe, 'protocol_bytes', 
                                      float(flow_data.get('total_fwd_bytes', 0) + flow_data.get('total_bwd_bytes', 0)),
                                      timestamp, {'protocol': protocol})
            
            self._add_timeseries_point(pipe, 'protocol_flows', 1.0,
                                      timestamp, {'protocol': protocol})
            
            # Process IP metrics
            src_ip = flow_data.get('src_ip')
            dst_ip = flow_data.get('dst_ip')
            self._add_timeseries_point(pipe, 'src_ip_bytes_out', 
                                      float(flow_data.get('total_fwd_bytes', 0)),
                                      timestamp, {'src_ip': src_ip})
            
            self._add_timeseries_point(pipe, 'dst_ip_bytes_in', 
                                      float(flow_data.get('total_bwd_bytes', 0)),
                                      timestamp, {'dst_ip': dst_ip})
            
            # Process port metrics
            src_port = str(flow_data.get('src_port'))
            dst_port = str(flow_data.get('dst_port'))
            self._add_timeseries_point(pipe, 'src_port_flows', 1.0,
                                      timestamp, {'src_port': src_port})
            
            self._add_timeseries_point(pipe, 'dst_port_flows', 1.0,
                                      timestamp, {'dst_port': dst_port})
            
            # Process TCP flag metrics if available
            if protocol == '6':  # TCP protocol
                self._add_timeseries_point(pipe, 'tcp_syn_count', 
                                          float(flow_data.get('syn_flag_count', 0)),
                                          timestamp, {'src_ip': src_ip})
                
                self._add_timeseries_point(pipe, 'tcp_fin_count', 
                                          float(flow_data.get('fin_flag_count', 0)),
                                          timestamp, {'src_ip': src_ip})
                
                self._add_timeseries_point(pipe, 'tcp_rst_count', 
                                          float(flow_data.get('rst_flag_count', 0)),
                                          timestamp, {'src_ip': src_ip})
            
            # Execute Redis commands
            pipe.execute()
            self.stats['timeseries_inserts_success'] += 1
            
            # Only log periodically to avoid excessive logging
            if self.stats['timeseries_inserts_success'] % 100 == 0:
                self.logger.debug(f"Inserted flow data into TimeSeries: {src_ip}:{src_port} -> {dst_ip}:{dst_port}")
                
        except RedisError as e:
            self.stats['timeseries_inserts_failed'] += 1
            self.logger.error(f"Error inserting TimeSeries data: {e}")
            
            # Check if Redis connection needs to be re-established
            self._check_redis_connection()

    def _add_timeseries_point(self, pipe, metric_name, value, timestamp, labels_dict):
        """Add a point to TimeSeries using Redis TS.ADD command"""
        # Build the labels string
        labels_list = []
        for label_name, label_value in labels_dict.items():
            labels_list.extend([label_name, label_value])
        
        # TS.ADD key timestamp value LABELS label1 val1 label2 val2...
        pipe.execute_command('TS.ADD', f"ts:{metric_name}", timestamp, value, 'LABELS', *labels_list)

    def _check_redis_connection(self):
        """Check if Redis connection is still alive and reconnect if needed"""
        try:
            self.redis_client.ping()
        except RedisError:
            self.logger.warning("Redis connection lost, attempting to reconnect...")
            self.connect_to_redis()

    def display_stats(self):
        """Display current statistics"""
        current_time = time.time()
        if current_time - self.stats['last_display'] > self.stats['display_interval']:
            self.logger.info(
                f"Stats: {self.stats['messages_consumed']} messages consumed, "
                f"{self.stats['timeseries_inserts_success']} timeseries inserts success, "
                f"{self.stats['timeseries_inserts_failed']} timeseries inserts failed"
            )
            self.stats['last_display'] = current_time

    def consume(self):
        """Consume messages from Kafka and insert into Redis TimeSeries"""
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
                            self._process_flow_data(flow_data)
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
        """Close Redis and Kafka connections"""
        if hasattr(self, 'redis_client'):
            self.redis_client.close()
        
        # Close Kafka consumer
        if hasattr(self, 'consumer'):
            self.consumer.close()
            
        self.logger.info("All connections closed. Consumer shutdown complete.")

def main():
    parser = argparse.ArgumentParser(description='Kafka Consumer for Redis TimeSeries Integration')
    parser.add_argument('--redis-host', required=True, help='Redis host')
    parser.add_argument('--redis-port', type=int, default=6379, help='Redis port')
    parser.add_argument('--redis-password', help='Redis password (if required)')
    parser.add_argument('--kafka-brokers', required=True, help='Kafka bootstrap servers (comma separated)')
    parser.add_argument('--kafka-topic', required=True, help='Kafka topic to consume from')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                        help='Logging level')
    parser.add_argument('--log-file', help='Log to file (in addition to console)')

    args = parser.parse_args()

    # Setup logging
    log_level = getattr(logging, args.log_level)
    logger = setup_logging(log_level=log_level, log_file=args.log_file)

    redis_params = {
        'host': args.redis_host,
        'port': args.redis_port,
    }
    if args.redis_password:
        redis_params['password'] = args.redis_password

    kafka_params = {
        'bootstrap_servers': args.kafka_brokers.split(','),
        'topic': args.kafka_topic
    }

    try:
        consumer = RedisTimeSeriesConsumer(redis_params, kafka_params, logger=logger)
        consumer.consume()
    except Exception as e:
        logger.critical(f"Fatal error in consumer: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()