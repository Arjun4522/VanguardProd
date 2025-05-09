// src/pages/GeoMap.jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchGeoData, connectWebSocket } from "../services/api";

// Fix Leaflet marker icons
L.Marker.prototype.options.icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Utility: check if IP is private
const isPrivateIP = (ip) => {
    if (!ip) return true;
    
    // Handle IPv6 private/multicast
    if (ip.includes(':')) {
      return (
        ip.startsWith('fe80:') || // Link-local IPv6
        ip.startsWith('fc00:') || ip.startsWith('fd00:') || // Unique local IPv6
        ip.startsWith('::1') || // IPv6 loopback
        ip.startsWith('ff00:') || ip.startsWith('ff02:') // Multicast
      );
    }
  
    // Handle IPv4 private
    return (
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
      ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') ||
      ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
      ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') ||
      ip.startsWith('172.31.') || ip.startsWith('169.254.') ||
      ip.startsWith('192.0.0.') || ip.startsWith('192.0.2.') ||
      ip.startsWith('192.67') ||
      ip.startsWith('192.168.') ||
      ip === '127.0.0.1'
    );
  };
  

const GeoMap = () => {
  const [locations, setLocations] = useState([]);
  const [knownIPs, setKnownIPs] = useState(new Set());

  useEffect(() => {
    const ws = connectWebSocket(async (flow) => {
      const { src_ip, dst_ip } = flow;

      const newIPs = [src_ip, dst_ip].filter(
        (ip) => ip && !isPrivateIP(ip) && !knownIPs.has(ip)
      );

      if (newIPs.length > 0) {
        const geoResults = await Promise.all(
          newIPs.map((ip) => fetchGeoData(ip))
        );

        const validResults = geoResults.filter(
          (data) => data && data.latitude && data.longitude
        );

        setLocations((prev) => [...prev, ...validResults]);

        setKnownIPs((prev) => {
          const updated = new Set(prev);
          newIPs.forEach((ip) => updated.add(ip));
          return updated;
        });
      }
    });

    return () => ws.close();
  }, [knownIPs]);

  return (
    <div className="h-screen">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%", backgroundColor: "#000" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> contributors'
        />
        {locations.map((loc, index) => (
          <Marker key={index} position={[loc.latitude, loc.longitude]}>
            <Popup>
              <div>
                <h3 className="font-bold">{loc.city || "Unknown City"}</h3>
                <p>IP: {loc.ip}</p>
                <p>ISP: {loc.org || "Unknown ISP"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GeoMap;
