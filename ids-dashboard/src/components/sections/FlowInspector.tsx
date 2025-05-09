import React, { useState, useMemo, useCallback } from 'react';
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
  useTheme,
  TextField,
  IconButton,
  Box,
  TablePagination,
  InputAdornment
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useFlows } from '../../context/FlowContext';
import { formatBytes, formatDuration, formatProtocol, formatTime } from '../../utils/formatUtils';

export const FlowInspector: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedFlow, setSelectedFlow] = useState<number | null>(null);

  // Memoized filtered and sorted flows
  const { filteredFlows, sortedFlows } = useMemo(() => {
    const filtered = state.flows.filter(flow => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        flow.src_ip.toLowerCase().includes(searchLower) ||
        flow.dst_ip.toLowerCase().includes(searchLower) ||
        flow.src_port.toString().includes(searchTerm) ||
        flow.dst_port.toString().includes(searchTerm) ||
        formatProtocol(flow.protocol).toLowerCase().includes(searchLower)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'timestamp') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortField === 'src_ip') {
        comparison = a.src_ip.localeCompare(b.src_ip);
      } else if (sortField === 'dst_ip') {
        comparison = a.dst_ip.localeCompare(b.dst_ip);
      } else if (sortField === 'protocol') {
        comparison = a.protocol - b.protocol;
      } else if (sortField === 'total_packets') {
        comparison = a.total_packets - b.total_packets;
      } else if (sortField === 'total_bytes') {
        comparison = a.total_bytes - b.total_bytes;
      } else if (sortField === 'flow_duration') {
        comparison = a.flow_duration - b.flow_duration;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return { filteredFlows: filtered, sortedFlows: sorted };
  }, [state.flows, searchTerm, sortField, sortDirection]);

  // Pagination calculations
  const paginatedFlows = useMemo(() => {
    return sortedFlows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedFlows, page, rowsPerPage]);

  // Handlers
  const handleSort = useCallback((field: string) => {
    setPage(0); // Reset to first page when sorting changes
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchTerm('');
    setPage(0);
  }, []);

  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  }, [sortField, sortDirection]);

  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '600px',
      maxHeight: '800px'
    }}>
      <CardContent sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        p: 0,
        overflow: 'hidden'
      }}>
        {/* Header with search */}
        <Box sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Typography variant="h6">Flow Inspector</Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredFlows.length} flows found
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter flows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSearchClear}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Advanced filters">
              <IconButton size="small">
                <FilterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Scrollable table area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          <TableContainer 
            component={Paper} 
            sx={{ 
              flex: 1,
              overflow: 'auto',
              backgroundColor: theme.palette.background.paper,
              '& .MuiTableCell-root': {
                py: 1,
                px: 1.5,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap'
              },
              '& .MuiTableRow-root:hover': {
                backgroundColor: theme.palette.action.hover
              },
              '& .MuiTableRow-root.Mui-selected': {
                backgroundColor: theme.palette.action.selected
              }
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    onClick={() => handleSort('timestamp')}
                    sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 120 }}
                  >
                    <Box display="flex" alignItems="center">
                      Time
                      {renderSortIcon('timestamp')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('src_ip')}
                    sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 160 }}
                  >
                    <Box display="flex" alignItems="center">
                      Source
                      {renderSortIcon('src_ip')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('dst_ip')}
                    sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 160 }}
                  >
                    <Box display="flex" alignItems="center">
                      Destination
                      {renderSortIcon('dst_ip')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('protocol')}
                    sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 100 }}
                  >
                    <Box display="flex" alignItems="center">
                      Protocol
                      {renderSortIcon('protocol')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('total_packets')}
                    sx={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', minWidth: 80 }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Packets
                      {renderSortIcon('total_packets')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('total_bytes')}
                    sx={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', minWidth: 100 }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Bytes
                      {renderSortIcon('total_bytes')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('flow_duration')}
                    sx={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', minWidth: 100 }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      Duration
                      {renderSortIcon('flow_duration')}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Flags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedFlows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ height: 300 }}>
                      <Typography color="textSecondary">
                        {searchTerm ? 'No flows match your search' : 'No flows available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFlows.map((flow, idx) => (
                    <TableRow 
                      key={`${flow.timestamp}-${flow.src_ip}-${flow.dst_ip}-${flow.src_port}`} 
                      hover
                      selected={selectedFlow === idx}
                      onClick={() => setSelectedFlow(idx)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{formatTime(flow.timestamp)}</TableCell>
                      <TableCell>
                        <Tooltip title={flow.src_ip} placement="top">
                          <span>{flow.src_ip}:{flow.src_port}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={flow.dst_ip} placement="top">
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
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell align="right">{flow.total_packets}</TableCell>
                      <TableCell align="right">{formatBytes(flow.total_bytes)}</TableCell>
                      <TableCell align="right">{formatDuration(flow.flow_duration)}</TableCell>
                      <TableCell>
                        {flow.tcp_flags && (
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {flow.tcp_flags.syn && <Chip label="SYN" size="small" sx={{ minWidth: 40 }} />}
                            {flow.tcp_flags.ack && <Chip label="ACK" size="small" sx={{ minWidth: 40 }} />}
                            {flow.tcp_flags.fin && <Chip label="FIN" size="small" sx={{ minWidth: 40 }} />}
                            {flow.tcp_flags.rst && <Chip label="RST" size="small" color="error" sx={{ minWidth: 40 }} />}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredFlows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ 
              borderTop: `1px solid ${theme.palette.divider}`,
              '& .MuiTablePagination-toolbar': {
                minHeight: 52,
                px: 1
              },
              flexShrink: 0
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};