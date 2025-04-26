import React from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useFlows } from '../../context/FlowContext';
import { formatBytes, formatDuration, formatProtocol } from '../../utils/formatUtils';

export const FlowInspector: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Flow Inspector
        </Typography>
        <TableContainer 
          component={Paper} 
          sx={{ 
            flex: 1, 
            backgroundColor: theme.palette.background.paper,
            '& .MuiTableCell-root': {
              padding: '8px 16px'
            }
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Protocol</TableCell>
                <TableCell>Packets</TableCell>
                <TableCell>Bytes</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Flags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.flows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ height: 300 }}>
                    <Typography color="textSecondary">
                      No flows to display
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                state.flows.map((flow, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      {new Date(flow.timestamp * 1000).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={flow.src_ip}>
                        <span>{flow.src_ip}:{flow.src_port}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={flow.dst_ip}>
                        <span>{flow.dst_ip}:{flow.dst_port}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={formatProtocol(flow.protocol)} 
                        size="small"
                        color={
                          flow.protocol === 6 ? 'primary' : 
                          flow.protocol === 17 ? 'secondary' : 
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{flow.total_packets}</TableCell>
                    <TableCell>{formatBytes(flow.total_bytes)}</TableCell>
                    <TableCell>{formatDuration(flow.flow_duration)}</TableCell>
                    <TableCell>
                      {flow.tcp_flags && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {flow.tcp_flags.syn && <Chip label="SYN" size="small" />}
                          {flow.tcp_flags.ack && <Chip label="ACK" size="small" />}
                          {flow.tcp_flags.fin && <Chip label="FIN" size="small" />}
                          {flow.tcp_flags.rst && <Chip label="RST" size="small" color="error" />}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};