// src/pages/Alerts.jsx
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { selectAlerts, clearAlert, clearAllAlerts } from '../redux/slices/alertsSlice';

const Alerts = () => {
  const alerts = useSelector(selectAlerts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  const filteredAlerts = alerts.filter(alert => {
    // Filter by type
    if (filterType !== 'all' && alert.type !== filterType) {
      return false;
    }
    
    // Filter by severity
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) {
      return false;
    }
    
    return true;
  });
  
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'error':
        return 'border-l-red-500 bg-gray-800 text-red-400';
      case 'warning':
        return 'border-l-yellow-500 bg-gray-800 text-yellow-300';
      case 'info':
        return 'border-l-blue-500 bg-gray-800 text-blue-300';
      default:
        return 'border-l-gray-500 bg-gray-800 text-gray-300';
    }
  };
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'info':
        return 'fa-info-circle';
      default:
        return 'fa-bell';
    }
  };
  
  const handleInvestigate = (alert) => {
    navigate(`/flow/${alert.flow.timestamp}`, { state: { flow: alert.flow } });
  };
  
  const handleDismiss = (alertId) => {
    dispatch(clearAlert(alertId));
    toast.dark('Alert dismissed');
  };
  
  const handleDismissAll = () => {
    dispatch(clearAllAlerts());
    toast.dark('All alerts dismissed');
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Alerts</h1>
        
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm mb-1 text-gray-300">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1"
            >
              <option value="all">All Types</option>
              <option value="high-volume">High Volume</option>
              <option value="suspicious-port">Suspicious Port</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm mb-1 text-gray-300">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1"
            >
              <option value="all">All Severities</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          
          {alerts.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 self-end"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>
      
      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`border-l-4 p-4 rounded shadow ${getSeverityClass(alert.severity)}`}
            >
              <div className="flex justify-between">
                <div className="flex items-start">
                  <i className={`fas ${getSeverityIcon(alert.severity)} mr-3 mt-1`}></i>
                  <div>
                    <div className="font-semibold">{alert.message}</div>
                    <div className="text-sm mt-1 text-gray-400">
                      {format(new Date(alert.timestamp), 'PPpp')}
                    </div>
                    <div className="text-sm mt-2 text-gray-300">
                      <span className="font-medium">Type:</span> {alert.type.replace('-', ' ')}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleInvestigate(alert)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-20">
          No alerts to display.
        </div>
      )}
    </div>
  );
};

export default Alerts;