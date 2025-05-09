import { connectWebSocket } from '../../services/api';
import { addFlow, setLoading } from '../slices/flowsSlice';
import { addAlerts } from '../slices/alertsSlice';
import { toast } from 'react-toastify';

const retryCount = 5; // Initialize retry count


const detectAlert = (flow) => {
  const alerts = [];
  const generateId = () => `${Date.now()}-${Math.random()}`;

  if (flow.total_bytes > 100000) {
    alerts.push({
      id: generateId(),
      type: 'high-volume',
      message: `High volume traffic detected: ${flow.total_bytes} bytes from ${flow.src_ip} to ${flow.dst_ip}`,
      severity: 'warning',
      flow,
      timestamp: new Date().toISOString(),
    });
  }

  const suspiciousPorts = [22, 23, 3389, 445, 135, 139];
  if (suspiciousPorts.includes(flow.dst_port)) {
    alerts.push({
      id: generateId(),
      type: 'suspicious-port',
      message: `Suspicious port ${flow.dst_port} accessed from ${flow.src_ip} to ${flow.dst_ip}`,
      severity: 'error',
      flow,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
};

let webSocket = null;
let retryTimeout = null;

export const initializeWebSocket = (dispatch) => {
  if (webSocket) {
    webSocket.close();
  }

  function connect() {
    webSocket = connectWebSocket((newFlow) => {
      const enrichedFlow = {
        ...newFlow,
        total_bytes: typeof newFlow.total_bytes === 'number'
          ? newFlow.total_bytes
          : (Number(newFlow.total_fwd_bytes || 0) + Number(newFlow.total_bwd_bytes || 0)),
      };

      dispatch(addFlow(enrichedFlow));

      const newAlerts = detectAlert(enrichedFlow);
      if (newAlerts.length > 0) {
        dispatch(addAlerts(newAlerts));
      
        // Fire a toast for each alert
        newAlerts.forEach(alert => {
          toast(alert.message, {
            type: alert.severity === 'error' ? 'error' : 'warning', // 🔥 error/warning color
            position: 'top-right',
            autoClose: 5000,
          });
        });
      }
    });

    webSocket.onopen = () => {
      console.log("WebSocket connected!");
      dispatch(setLoading(false));
    };

    webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      retryConnect();
    };

    webSocket.onclose = () => {
      console.warn('WebSocket closed. Attempting to reconnect...');
      retryConnect();
    };
  }

  // In webSocketService.js
function retryConnect() {
  if (retryTimeout) clearTimeout(retryTimeout);
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
  retryTimeout = setTimeout(() => {
    console.log(`Retrying WebSocket (attempt ${retryCount})...`);
    connect();
  }, delay);
}

  connect();
  return webSocket;
};

export const closeWebSocket = () => {
  if (retryTimeout) clearTimeout(retryTimeout);
  if (webSocket) {
    webSocket.close();
    webSocket = null;
  }
};
