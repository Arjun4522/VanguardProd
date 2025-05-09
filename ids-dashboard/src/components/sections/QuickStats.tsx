// src/components/dashboard/QuickStats.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import {
  Timeline,
  Security,
  NetworkCheck,
  Speed,
  SettingsEthernet,
  Cable,
  Public,
  Dashboard as DashboardIcon,
  Hub // New icon for multicast
} from '@mui/icons-material';
import { useFlows } from '../../context/FlowContext';
import { formatBytes, formatNumber, formatDuration } from '../../utils/formatUtils';

export const QuickStats: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));

  // Prepare metrics
  const totalBytes = state.stats.totalBytes ?? 0;
  const totalPackets = state.stats.totalPackets ?? 0;
  const flowCount = state.flows.length ?? 0;
  const anomalyCount = state.anomalies.length ?? 0;
  const avgFlowDuration = flowCount > 0
    ? state.flows.reduce((sum, f) => sum + (f.flow_duration || 0), 0) / flowCount
    : 0;

  // Calculate IPv6 multicast stats
  const ipv6MulticastFlows = state.flows.filter(f => 
    f.dst_ip?.startsWith('ff02::') || f.dst_ip?.startsWith('ff01::')
  );
  const ipv6MulticastCount = ipv6MulticastFlows.length;
  const ipv6MulticastBytes = ipv6MulticastFlows.reduce((sum, f) => sum + (f.total_bytes || 0), 0);

  const topProtocol = flowCount > 0
    ? state.flows.reduce((acc: Record<string, number>, f) => {
        const p = f.protocol?.toString() || 'other';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {})
    : {};
  const mostCommonProtocol = Object.entries(topProtocol)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const uniqueIPs = new Set(
    state.flows.flatMap(f => [f.src_ip, f.dst_ip].filter(Boolean))
  ).size;

  const redirectToGrafana = () => window.open(
    'https://grafana.example.com/d/network-monitoring', '_blank'
  );

  const stats = [
    {
      title: 'Total Traffic',
      value: formatBytes(totalBytes),
      icon: <NetworkCheck fontSize="large" />, 
      progress: Math.min(100, (totalBytes / 1e7) * 100),
      color: 'primary'
    },
    {
      title: 'Packets/Sec',
      value: formatNumber(totalPackets),
      icon: <Speed fontSize="large" />, 
      progress: Math.min(100, (totalPackets / 1e3) * 100),
      color: 'secondary'
    },
    {
      title: 'Active Flows',
      value: flowCount,
      icon: <Timeline fontSize="large" />, 
      progress: Math.min(100, (flowCount / 500) * 100),
      color: 'info'
    },
    {
      title: 'Threats Detected',
      value: anomalyCount,
      icon: <Security fontSize="large" />, 
      progress: Math.min(100, (anomalyCount / 50) * 100),
      color: anomalyCount > 10 ? 'error' : 'warning'
    },
    {
      title: 'IPv6 Multicast',
      value: `${ipv6MulticastCount} flows`,
      secondaryValue: formatBytes(ipv6MulticastBytes),
      icon: <Hub fontSize="large" />,
      progress: Math.min(100, (ipv6MulticastCount / 10) * 100),
      color: 'info'
    },
    {
      title: 'Top Protocol',
      value: mostCommonProtocol === '6' ? 'TCP' : mostCommonProtocol === '17' ? 'UDP' : mostCommonProtocol,
      icon: <Cable fontSize="large" />, 
      progress: mostCommonProtocol === '6' ? 80 : mostCommonProtocol === '17' ? 60 : 40,
      color: 'info'
    },
    {
      title: 'Unique IPs',
      value: formatNumber(uniqueIPs),
      icon: <Public fontSize="large" />, 
      progress: Math.min(100, (uniqueIPs / 50) * 100),
      color: 'primary'
    },
    {
      title: 'Avg Flow Duration',
      value: formatDuration(avgFlowDuration),
      icon: <SettingsEthernet fontSize="large" />, 
      progress: Math.min(100, (avgFlowDuration / 60) * 100),
      color: 'success'
    },
    {
      title: 'Grafana Dashboard',
      value: 'Open',
      icon: <DashboardIcon fontSize="large" />, 
      progress: 100,
      color: 'success',
      action: redirectToGrafana
    }
  ];

  return (
    <Box
      component="div"
      sx={{
        display: 'grid',
        gridTemplateColumns: isLarge
          ? 'repeat(9, 1fr)'
          : 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: theme.spacing(2)
      }}
    >
      {stats.map((stat, idx) => (
        <Card
          key={idx}
          sx={{ height: '100%', cursor: stat.action ? 'pointer' : 'default' }}
          onClick={stat.action}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ mr: 1, color: theme.palette[stat.color]?.main }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" noWrap>
                  {stat.title}
                </Typography>
                <Typography variant="h6" noWrap>
                  {stat.value}
                </Typography>
                {stat.secondaryValue && (
                  <Typography variant="caption" display="block">
                    {stat.secondaryValue}
                  </Typography>
                )}
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stat.progress}
              color={stat.color as any}
              sx={{ height: 6, borderRadius: 3 }}
            />
            {stat.action && (
              <Typography variant="caption" align="right" mt={0.5}>
                Click to view
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};