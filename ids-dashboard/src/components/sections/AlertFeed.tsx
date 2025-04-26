import React from 'react';
import { 
  Card,
  CardContent,
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip,
  Typography,
  useTheme,
  Box
} from '@mui/material';
import { Warning, Error, Info, Security } from '@mui/icons-material';
import { useFlows } from '../../context/FlowContext';

export const AlertFeed: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();

  const getIcon = (confidence: number) => {
    if (confidence > 80) return <Error color="error" />;
    if (confidence > 50) return <Warning color="warning" />;
    return <Info color="info" />;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Security Alerts
        </Typography>
        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {state.anomalies.length === 0 ? (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: 200,
                color: theme.palette.text.secondary
              }}
            >
              <Security sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="body1">No threats detected</Typography>
            </Box>
          ) : (
            state.anomalies.map((anomaly, index) => (
              <ListItem key={index} divider>
                <ListItemIcon>
                  {getIcon(anomaly.confidence)}
                </ListItemIcon>
                <ListItemText
                  primary={anomaly.type}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {anomaly.src_ip}
                      </Typography>
                      {` - ${new Date(anomaly.timestamp * 1000).toLocaleTimeString()}`}
                      {anomaly.description && (
                        <Typography component="div" variant="caption" color="text.secondary">
                          {anomaly.description}
                        </Typography>
                      )}
                    </>
                  }
                />
                <Chip 
                  label={`${anomaly.confidence}%`} 
                  size="small"
                  color={anomaly.confidence > 80 ? 'error' : 'warning'}
                />
              </ListItem>
            ))
          )}
        </List>
      </CardContent>
    </Card>
  );
};