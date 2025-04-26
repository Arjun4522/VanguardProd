import { Flow, Anomaly } from '../types/flows';

export const detectAnomalies = (flow: Flow): Anomaly | null => {
  // Port scan detection
  if (flow.total_packets === 1 && flow.dst_port > 49152) {
    return {
      type: 'PortScan',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 85,
      flow,
      description: `Suspicious port scan detected on port ${flow.dst_port}`
    };
  }

  // DNS tunnel detection
  if (flow.protocol === 17 && flow.dst_port === 53 && flow.total_bytes > 512) {
    return {
      type: 'DNSTunnel',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 75,
      flow,
      description: 'Possible DNS tunneling detected (large DNS payload)'
    };
  }

  // High volume UDP
  if (flow.protocol === 17 && flow.total_bytes > 1000000) {
    return {
      type: 'UDPFlood',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 65,
      flow,
      description: 'Potential UDP flood attack detected'
    };
  }

  // TCP SYN flood
  if (flow.protocol === 6 && flow.tcp_flags?.syn && !flow.tcp_flags?.ack) {
    return {
      type: 'SYNFlood',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 70,
      flow,
      description: 'Potential SYN flood attack detected'
    };
  }

  // ICMP flood
  if (flow.protocol === 1 && flow.total_packets > 100) {
    return {
      type: 'ICMPFlood',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 60,
      flow,
      description: 'Potential ICMP flood detected'
    };
  }

  return null;
};