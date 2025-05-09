// src/services/api.js
import axios from 'axios';
const geoCache = new Map();

const API_URL = 'http://127.0.0.1:8888';

export const fetchRecentFlows = async (limit = 100) => {
  const response = await axios.get(`${API_URL}/flows?limit=${limit}`);
  return response.data;
};

export const fetchLatestFlow = async () => {
  const response = await axios.get(`${API_URL}/flows/latest`);
  return response.data;
};

export const searchFlows = async (params) => {
  const response = await axios.get(`${API_URL}/flows/search`, { params });
  return response.data;
};

export const fetchGeoData = async (ip) => {
  if (geoCache.has(ip)) return geoCache.get(ip);
  
  try {
    const response = await axios.get(`${API_URL}/geoip/${ip}`);
    geoCache.set(ip, response.data);
    return response.data;
  } catch (error) {
    console.error(`GeoIP fetch failed for ${ip}:`, error);
    return null;
  }
};

// WebSocket connection for real-time updates
export const connectWebSocket = (onMessage) => {
  const ws = new WebSocket(`ws://127.0.0.1:8888/flows/ws`);
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return ws;
};