export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

export const formatDuration = (microseconds: number): string => {
  if (microseconds < 1000) return `${microseconds.toFixed(2)}µs`;
  if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(2)}ms`;
  return `${(microseconds / 1000000).toFixed(2)}s`;
};

export const formatProtocol = (protocol: number): string => {
  const protocols: Record<number, string> = {
    1: 'ICMP',
    6: 'TCP',
    17: 'UDP',
    58: 'ICMPv6'
  };
  return protocols[protocol] || `Unknown (${protocol})`;
};

export const formatIP = (ip: string): string => {
  if (ip.startsWith('fe80:')) return 'Link-Local';
  if (ip.startsWith('ff02:')) return 'Multicast';
  if (ip === '239.255.255.250') return 'SSDP';
  if (ip === '224.0.0.1') return 'Multicast';
  return ip;
};