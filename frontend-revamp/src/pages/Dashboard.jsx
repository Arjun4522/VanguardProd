// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchRecentFlows } from '../services/api';
import { selectFlows, selectIsLoading } from '../redux/slices/flowsSlice';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import CountUp from 'react-countup';

const Dashboard = () => {
  const flows = useSelector(selectFlows);
  const isLoadingRedux = useSelector(selectIsLoading);
  const [timeFrameFlows, setTimeFrameFlows] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [showFilteredOnly, setShowFilteredOnly] = useState(true);

  const { data, isLoading: isLoadingQuery, error } = useQuery({
    queryKey: ['recentFlows'],
    queryFn: () => fetchRecentFlows(100),
    refetchInterval: refreshInterval,
  });

  const allFlows = data || flows;
  
  // Filter to only show TCP, UDP, and ICMP packets if filter is enabled
  const activeFlows = useMemo(() => {
    if (!showFilteredOnly) {
      return allFlows;
    }
    return allFlows.filter(flow => {
      const protocolNum = parseInt(flow.protocol);
      return protocolNum === 1 || protocolNum === 6 || protocolNum === 17; // ICMP, TCP, UDP
    });
  }, [allFlows, showFilteredOnly]);

  useEffect(() => {
    if (activeFlows.length > 0) {
      const timeData = {};
      const now = Date.now();
      const timeWindow = 30 * 60 * 1000;

      activeFlows.forEach(flow => {
        const timestamp = flow.timestamp * 1000;
        if (now - timestamp <= timeWindow) {
          const timeKey = format(timestamp, 'HH:mm');
          if (!timeData[timeKey]) {
            timeData[timeKey] = { time: timeKey, bytes: 0, packets: 0, flows: 0 };
          }
          timeData[timeKey].bytes += flow.total_bytes;
          timeData[timeKey].packets += flow.total_packets;
          timeData[timeKey].flows += 1;
        }
      });

      setTimeFrameFlows(Object.values(timeData).sort((a, b) => a.time.localeCompare(b.time)));
    }
  }, [activeFlows]);

  const protocolData = useMemo(() => {
    const protocolCountMap = {};
    activeFlows.forEach(flow => {
      const protocol = flow.protocol;
      protocolCountMap[protocol] = (protocolCountMap[protocol] || 0) + 1;
    });

    return Object.entries(protocolCountMap).map(([protocol, count]) => {
      let protocolName = "Unknown";
      switch (parseInt(protocol)) {
        case 1: protocolName = "ICMP"; break;
        case 6: protocolName = "TCP"; break;
        case 17: protocolName = "UDP"; break;
        default: protocolName = `Protocol ${protocol}`;
      }
      return { name: protocolName, value: count };
    });
  }, [activeFlows]);

  const topSourceIps = useMemo(() => {
    const sourceIpMap = {};
    activeFlows.forEach(flow => {
      sourceIpMap[flow.src_ip] = (sourceIpMap[flow.src_ip] || 0) + 1;
    });

    return Object.entries(sourceIpMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ name: ip, value: count }));
  }, [activeFlows]);

  const totalTrafficMB = useMemo(() => {
    return (activeFlows.reduce((sum, flow) => sum + flow.total_bytes, 0) / (1024 * 1024)).toFixed(2);
  }, [activeFlows]);

  const totalPackets = useMemo(() => {
    return activeFlows.reduce((sum, flow) => sum + flow.total_packets, 0);
  }, [activeFlows]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a28af9', '#00c49f', '#ff6b6b', '#4ecdc4', '#c7f464', '#81d4fa'];

  if (isLoadingRedux || isLoadingQuery) {
    return (
      <div className="p-6 flex items-center justify-center bg-gray-900 h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-400 bg-gray-900 h-screen">Error loading dashboard data</div>;
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Network Flow Dashboard</h1>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <label className="mr-2">
              <input
                type="checkbox"
                checked={showFilteredOnly}
                onChange={() => setShowFilteredOnly(!showFilteredOnly)}
                className="mr-1"
              />
              Show only TCP/UDP/ICMP
            </label>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1"
          >
            <option value={5000}>Refresh: 5s</option>
            <option value={15000}>Refresh: 15s</option>
            <option value={30000}>Refresh: 30s</option>
            <option value={60000}>Refresh: 1m</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Flows</h2>
          <p className="text-3xl">
            <CountUp end={activeFlows.length} duration={1} />
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Unique Source IPs</h2>
          <p className="text-3xl">
            <CountUp end={topSourceIps.length} duration={1} />
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Traffic</h2>
          <p className="text-3xl">
            <CountUp end={parseFloat(totalTrafficMB)} decimals={2} duration={1} /> MB
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Packets</h2>
          <p className="text-3xl">
            <CountUp end={totalPackets} duration={1} />
          </p>
        </div>
      </div>

      {/* Rest of the Dashboard component remains the same */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Traffic Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeFrameFlows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', borderColor: '#444' }} />
                <Area type="monotone" dataKey="bytes" stroke="#82ca9d" fill="#82ca9d" name="Bytes" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Protocol Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {protocolData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', borderColor: '#444' }} />
                <Legend wrapperStyle={{ color: '#ccc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Top Source IPs</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSourceIps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', borderColor: '#444' }} />
              <Bar dataKey="value" fill="#8884d8" name="Flow Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;