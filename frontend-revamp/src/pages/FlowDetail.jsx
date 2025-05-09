// src/pages/FlowDetail.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { searchFlows } from '../services/api';
import { format } from 'date-fns';

const FlowDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { flow } = location.state || {};
  const [relatedFlows, setRelatedFlows] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!flow) {
      navigate('/logs');
      return;
    }

    const fetchRelatedFlows = async () => {
      setIsLoading(true);
      try {
        const srcFlows = await searchFlows({ src_ip: flow.src_ip });
        const dstFlows = await searchFlows({ dst_ip: flow.dst_ip });

        const allFlows = [...srcFlows, ...dstFlows];
        const uniqueFlows = allFlows.filter((f, index, self) =>
          index === self.findIndex(t => t.timestamp === f.timestamp)
        );

        setRelatedFlows(
          uniqueFlows
            .filter(f => f.timestamp !== flow.timestamp)
            .sort((a, b) => b.timestamp - a.timestamp)
        );
      } catch (error) {
        console.error('Error fetching related flows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedFlows();
  }, [flow, navigate]);

  if (!flow) {
    return <div className="p-6">Loading...</div>;
  }

  const getProtocolName = (protocol) => {
    switch (protocol) {
      case 1: return 'ICMP';
      case 6: return 'TCP';
      case 17: return 'UDP';
      default: return `Protocol ${protocol}`;
    }
  };

  const getPortService = (port) => {
    const commonPorts = {
      20: 'FTP Data',
      21: 'FTP Control',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      123: 'NTP',
      443: 'HTTPS',
      3389: 'RDP'
    };
    return commonPorts[port] || `Port ${port}`;
  };

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <i className="fas fa-arrow-left mr-1"></i> Back
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h1 className="text-xl font-bold mb-2 dark:text-white">
          Flow Detail: {flow.src_ip}:{flow.src_port} → {flow.dst_ip}:{flow.dst_port}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {format(new Date(flow.timestamp * 1000), 'PPpp')}
        </p>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['overview', 'related', 'raw'].map(tab => (
              <button
                key={tab}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Flow Information</h2>
            <table className="min-w-full">
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  ['Protocol', `${getProtocolName(flow.protocol)} (${flow.protocol})`],
                  ['Source', 
                    <>
                      {flow.src_ip}:{flow.src_port}
                      <button 
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400"
                        onClick={() => navigate('/logs', { state: { searchIp: flow.src_ip } })}
                      >
                        Search
                      </button>
                    </>
                  ],
                  ['Destination',
                    <>
                      {flow.dst_ip}:{flow.dst_port} ({getPortService(flow.dst_port)})
                      <button 
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400"
                        onClick={() => navigate('/logs', { state: { searchIp: flow.dst_ip } })}
                      >
                        Search
                      </button>
                    </>
                  ],
                  ['Total Bytes', flow.total_bytes.toLocaleString()],
                  ['Total Packets', flow.total_packets.toLocaleString()],
                  ['Flow Duration', `${flow.flow_duration.toFixed(4)} seconds`]
                ].map(([label, value], idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4 font-medium dark:text-gray-300">{label}</td>
                    <td className="dark:text-gray-100">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Traffic Analysis</h2>
            <div>
              {[
                ['Bytes per Packet', flow.total_packets > 0 
                  ? `${(flow.total_bytes / flow.total_packets).toFixed(2)} bytes/packet` 
                  : 'No packet data available'],
                ['Bandwidth Usage', flow.flow_duration > 0 
                  ? `${((flow.total_bytes * 8) / flow.flow_duration / 1000).toFixed(2)} Kbps`
                  : 'Duration data not available or negative'],
                ['Traffic Direction', `${flow.src_ip} → ${flow.dst_ip}`]
              ].map(([title, value], idx) => (
                <div key={idx} className="mb-4">
                  <h3 className="font-medium mb-2 dark:text-gray-300">{title}</h3>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-lg dark:text-gray-100">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'related' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Related Flows</h2>
          {isLoading ? (
            <div className="text-center py-4 dark:text-gray-400">Loading related flows...</div>
          ) : relatedFlows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Timestamp', 'Source', 'Destination', 'Protocol', 'Bytes', 'Action'].map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {relatedFlows.slice(0, 20).map((relFlow, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {format(new Date(relFlow.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {relFlow.src_ip}:{relFlow.src_port}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {relFlow.dst_ip}:{relFlow.dst_port}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {getProtocolName(relFlow.protocol)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {relFlow.total_bytes.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => navigate(`/flow/${relFlow.timestamp}`, { state: { flow: relFlow } })}
                          className="hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">No related flows found</div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Raw Flow Data</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-gray-700 dark:text-gray-200">
            {JSON.stringify(flow, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FlowDetail;
