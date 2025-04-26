export interface Flow {
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: number;
  flow_duration: number;
  total_packets: number;
  total_bytes: number;
  timestamp: number;
  is_complete?: boolean;
  tcp_flags?: {
    syn?: boolean;
    fin?: boolean;
    rst?: boolean;
    psh?: boolean;
    ack?: boolean;
    urg?: boolean;
  };
}

export interface Anomaly {
  type: string;
  src_ip: string;
  timestamp: number;
  confidence: number;
  flow: Flow;
  description?: string;
}

export interface FlowState {
  flows: Flow[];
  anomalies: Anomaly[];
  stats: {
    totalBytes: number;
    totalPackets: number;
    topSources: string[];
    threatsByType: Record<string, number>;
  };
}