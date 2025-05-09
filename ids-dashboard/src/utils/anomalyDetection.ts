import { Flow, Anomaly } from '../types/flows';

// Constants for configuring the port scan detection
const SCAN_TIME_WINDOW = 60 * 5; // 5 minutes time window for port scan detection (in seconds)
const SCAN_THRESHOLD = 10; // Number of unique ports scanned before it's considered a port scan

// Store port scan data to track the scanning attempts for each source IP
let previousPortScans: { [src_ip: string]: { ports: Set<number>; lastTimestamp: number } } = {};

export const detectAnomalies = (flow: Flow): Anomaly | null => {
  const currentTime = flow.timestamp;

  // Initialize tracking for the source IP if it's not already in previousPortScans
  if (!previousPortScans[flow.src_ip]) {
    previousPortScans[flow.src_ip] = { ports: new Set(), lastTimestamp: currentTime };
  }

  const ipData = previousPortScans[flow.src_ip];

  // Check if the source IP has been scanning multiple ports within a short period
  if (currentTime - ipData.lastTimestamp < SCAN_TIME_WINDOW) {
    ipData.ports.add(flow.dst_port);  // Add port to the set
  } else {
    // If the flow is outside the time window, reset the tracking
    ipData.ports = new Set([flow.dst_port]);
  }

  ipData.lastTimestamp = currentTime; // Update last timestamp for the source IP

  // If the number of scanned ports exceeds the threshold, consider it a port scan
  if (ipData.ports.size >= SCAN_THRESHOLD && flow.dst_port > 49152) {
    return {
      type: 'PortScan',
      src_ip: flow.src_ip,
      timestamp: flow.timestamp,
      confidence: 85,
      flow,
      description: `Suspicious port scan detected from ${flow.src_ip}, scanning ${ipData.ports.size} ports in the last 5 minutes.`
    };
  }

  // DNS Tunnel detection logic
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

  // High volume UDP detection
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

  // TCP SYN flood detection
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

  // ICMP flood detection
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

  // No anomaly detected for this flow
  return null;
};
