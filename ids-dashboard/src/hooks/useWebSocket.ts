// src/hooks/useWebSocket.ts
import { useEffect } from 'react';
import { useFlows } from '../context/FlowContext';
import { detectAnomalies } from '../utils/anomalyDetection';

export const useWebSocket = () => {
  const { dispatch } = useFlows();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8888/flows/ws');

    const handleMessage = (event: MessageEvent) => {
      try {
        const flow = JSON.parse(event.data);
        dispatch({ type: 'ADD_FLOWS', payload: [flow] });
        
        const anomaly = detectAnomalies(flow);
        if (anomaly) {
          dispatch({ type: 'ADD_ANOMALY', payload: anomaly });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send initial ping
      ws.send('ping');
    };

    ws.onmessage = handleMessage;
    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket disconnected');

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [dispatch]);
};