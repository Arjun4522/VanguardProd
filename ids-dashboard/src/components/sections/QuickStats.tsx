import React from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress,
  useTheme,
  Box
} from '@mui/material';
import { 
  Timeline,
  ShowChart,
  Security,
  NetworkCheck,
  Speed
} from '@mui/icons-material';
import { useFlows } from '../../context/FlowContext';
import { formatBytes, formatNumber } from '../../utils/formatUtils';

export const QuickStats: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();

  const stats = [
    {
      title: 'Total Traffic',
      value: formatBytes(state.stats.totalBytes),
      icon: <NetworkCheck fontSize="large" />,
      progress: Math.min(100, state.stats.totalBytes / 10000000 * 100),
      color: 'primary'
    },
    {
      title: 'Packets/Sec',
      value: formatNumber(state.stats.totalPackets),
      icon: <Speed fontSize="large" />,
      progress: Math.min(100, state.stats.totalPackets / 1000 * 100),
      color: 'secondary'
    },
    {
      title: 'Active Flows',
      value: state.flows.length,
      icon: <Timeline fontSize="large" />,
      progress: Math.min(100, state.flows.length / 500 * 100),
      color: 'info'
    },
    {
      title: 'Threats Detected',
      value: state.anomalies.length,
      icon: <Security fontSize="large" />,
      progress: Math.min(100, state.anomalies.length / 50 * 100),
      color: state.anomalies.length > 10 ? 'error' : 'warning'
    }
  ];

  return (
    <Grid container spacing={2}>
      {stats.map((stat, index) => (
        <Grid key={index} item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '50%',
                    backgroundColor: theme.palette[stat.color].main,
                    color: theme.palette[stat.color].contrastText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {React.cloneElement(stat.icon, { 
                    sx: { fontSize: 24 } 
                  })}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h5">
                    {stat.value}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stat.progress}
                color={stat.color as any}
                sx={{ 
                  mt: 2,
                  height: 8,
                  borderRadius: 4
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};