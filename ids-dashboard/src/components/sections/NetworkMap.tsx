import React, { useMemo, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, Typography, useTheme } from '@mui/material';
import { useFlows } from '../../context/FlowContext';
import { formatIP } from '../../utils/formatUtils';

export const NetworkMap: React.FC = () => {
  const { state } = useFlows();
  const theme = useTheme();
  const graphRef = useRef<any>();

  const graphData = useMemo(() => {
    const nodes = new Map<string, { id: string; group: number; size: number }>();
    const links: { source: string; target: string; value: number }[] = [];
    
    state.flows.slice(0, 100).forEach(flow => {
      if (!nodes.has(flow.src_ip)) {
        nodes.set(flow.src_ip, { 
          id: flow.src_ip,
          group: flow.src_ip.startsWith('192.168') ? 1 : 2,
          size: Math.min(10, Math.log10(flow.total_bytes || 1))
        });
      }
      
      if (flow.dst_ip && !nodes.has(flow.dst_ip)) {
        nodes.set(flow.dst_ip, { 
          id: flow.dst_ip,
          group: flow.dst_ip.startsWith('192.168') ? 1 : 3,
          size: Math.min(10, Math.log10(flow.total_bytes || 1))
        });
      }
      
      if (flow.dst_ip) {
        links.push({
          source: flow.src_ip,
          target: flow.dst_ip,
          value: Math.log10(flow.total_bytes || 1)
        });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [state.flows]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Network Activity
        </Typography>
        <div style={{ height: '500px' }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={node => `${formatIP(node.id)}\nTraffic: ${node.size?.toFixed(1)}`}
            nodeColor={node => {
              if (node.group === 1) return theme.palette.primary.main;
              if (node.group === 2) return theme.palette.secondary.main;
              return theme.palette.error.main;
            }}
            linkColor={() => theme.palette.text.secondary}
            linkWidth={link => (link.value || 1) * 0.5}
            nodeCanvasObject={(node, ctx) => {
              const label = formatIP(node.id);
              const fontSize = 10;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = node.group === 1 
                ? theme.palette.primary.main 
                : node.group === 2 
                  ? theme.palette.secondary.main 
                  : theme.palette.error.main;
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.size || 5, 0, 2 * Math.PI, false);
              ctx.fill();
              ctx.fillStyle = theme.palette.text.primary;
              ctx.fillText(label, node.x, node.y + 15);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};