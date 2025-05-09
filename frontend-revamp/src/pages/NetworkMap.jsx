import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectFlows } from "../redux/slices/flowsSlice";
import { ForceGraph2D } from "react-force-graph";
import { useNavigate } from "react-router-dom";

const NetworkMap = () => {
  const flows = useSelector(selectFlows);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [filterOptions, setFilterOptions] = useState({
    protocol: "all",
    minTraffic: 0,
    maxTraffic: 100000,
    timeWindow: "all",
    nodeSearch: "",
  });
  const [graphMetrics, setGraphMetrics] = useState({
    nodeCount: 0,
    linkCount: 0,
    totalTraffic: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navigate = useNavigate();
  const graphRef = useRef();
  const sidebarRef = useRef();

  // Handle window resize for responsive graph
  const handleResize = useCallback(() => {
    if (graphRef.current) {
      const containerWidth = isFullscreen 
        ? window.innerWidth 
        : window.innerWidth * 0.75;
      
      // Update dimensions
      graphRef.current.width = containerWidth;
      graphRef.current.height = window.innerHeight;
      
      // Center graph after resize
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 40);
      }, 100);
    }
  }, [isFullscreen]);
  
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Process flow data
  useEffect(() => {
    if (flows.length > 0) {
      const filteredFlows = flows.filter((flow) => {
        // Filter by protocol
        if (
          filterOptions.protocol !== "all" &&
          flow.protocol !== parseInt(filterOptions.protocol)
        ) {
          return false;
        }

        // Filter by traffic range
        if (
          flow.total_bytes < filterOptions.minTraffic ||
          flow.total_bytes > filterOptions.maxTraffic
        ) {
          return false;
        }

        // Filter by time window
        if (filterOptions.timeWindow !== "all") {
          const now = Date.now();
          const flowTime = flow.timestamp * 1000;
          const timeWindowMs = parseInt(filterOptions.timeWindow) * 60 * 1000;
          if (now - flowTime > timeWindowMs) {
            return false;
          }
        }

        return true;
      });

      // Build nodes and links from filtered flows
      const nodes = new Map();
      const links = [];
      let totalTraffic = 0;

      filteredFlows.forEach((flow) => {
        // Filter by node search if specified
        if (filterOptions.nodeSearch && 
            !flow.src_ip.includes(filterOptions.nodeSearch) && 
            !flow.dst_ip.includes(filterOptions.nodeSearch)) {
          return;
        }
        
        // Add source node if not exists
        if (!nodes.has(flow.src_ip)) {
          nodes.set(flow.src_ip, {
            id: flow.src_ip,
            name: flow.src_ip,
            val: 1,
            group: "source",
            flows: [],
            totalTrafficOut: flow.total_bytes,
            connectionCount: 1
          });
        } else {
          // Update node metrics
          const node = nodes.get(flow.src_ip);
          node.val += 1;
          node.totalTrafficOut = (node.totalTrafficOut || 0) + flow.total_bytes;
          node.connectionCount = (node.connectionCount || 0) + 1;
        }

        // Add destination node if not exists
        if (!nodes.has(flow.dst_ip)) {
          nodes.set(flow.dst_ip, {
            id: flow.dst_ip,
            name: flow.dst_ip,
            val: 1,
            group: "destination",
            flows: [],
            totalTrafficIn: flow.total_bytes,
            connectionCount: 1
          });
        } else {
          // Update node metrics
          const node = nodes.get(flow.dst_ip);
          node.val += 1;
          node.totalTrafficIn = (node.totalTrafficIn || 0) + flow.total_bytes;
          node.connectionCount = (node.connectionCount || 0) + 1;
        }

        // Store flow info in both nodes
        nodes.get(flow.src_ip).flows.push(flow);
        nodes.get(flow.dst_ip).flows.push(flow);

        // Check if link already exists between these nodes
        const existingLinkIndex = links.findIndex(link => 
          link.source === flow.src_ip && link.target === flow.dst_ip &&
          link.port === flow.dst_port && link.protocol === flow.protocol
        );

        if (existingLinkIndex !== -1) {
          // Update existing link
          links[existingLinkIndex].value += flow.total_bytes;
          links[existingLinkIndex].flowCount = (links[existingLinkIndex].flowCount || 1) + 1;
          links[existingLinkIndex].flows.push(flow);
        } else {
          // Add new link
          links.push({
            source: flow.src_ip,
            target: flow.dst_ip,
            value: flow.total_bytes,
            protocol: flow.protocol,
            port: flow.dst_port,
            flowInfo: flow,
            flowCount: 1,
            flows: [flow]
          });
        }

        totalTraffic += flow.total_bytes;
      });

      // Update graph metrics
      setGraphMetrics({
        nodeCount: nodes.size,
        linkCount: links.length,
        totalTraffic
      });

      setGraphData({
        nodes: Array.from(nodes.values()),
        links,
      });
    }
  }, [flows, filterOptions]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    
    // Highlight connected nodes and links
    const connectedNodes = new Set();
    const connectedLinks = new Set();
    
    graphData.links.forEach(link => {
      if (link.source.id === node.id || link.target.id === node.id) {
        connectedNodes.add(link.source);
        connectedNodes.add(link.target);
        connectedLinks.add(link);
      }
    });
    
    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  };

  const handleLinkClick = (link) => {
    // Navigate to flow detail when clicking on a link
    navigate(`/flow/${link.flowInfo.timestamp}`, {
      state: { flow: link.flowInfo },
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions((prev) => ({
      ...prev,
      [name]: ["minTraffic", "maxTraffic"].includes(name) ? parseInt(value) : value,
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const clearSelection = () => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  };

  const resetFilters = () => {
    setFilterOptions({
      protocol: "all",
      minTraffic: 0,
      maxTraffic: 100000,
      timeWindow: "all",
      nodeSearch: "",
    });
    clearSelection();
  };

  const centerGraph = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40);
    }
  };

  // Helper function to get protocol name
  const getProtocolName = (protocolNumber) => {
    switch (parseInt(protocolNumber)) {
      case 1: return "ICMP";
      case 6: return "TCP";
      case 17: return "UDP";
      default: return protocolNumber ? `Protocol ${protocolNumber}` : "All";
    }
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-screen flex bg-gray-900 text-gray-100">
      <div className={`${isFullscreen ? 'w-full' : 'w-3/4'} h-full bg-black relative flex items-center justify-center transition-all duration-300`}>
        {graphData.nodes.length > 0 ? (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={isFullscreen ? window.innerWidth : window.innerWidth * 0.65}
              height={window.innerHeight}
              nodeLabel={(node) => `${node.name}\nConnections: ${node.connectionCount}\nTraffic In: ${formatBytes(node.totalTrafficIn || 0)}\nTraffic Out: ${formatBytes(node.totalTrafficOut || 0)}`}
              backgroundColor="#000000"
              nodeColor={(node) => {
                // Highlight selected node and connections
                if (highlightNodes.size > 0) {
                  return highlightNodes.has(node) 
                    ? (node.group === "source" ? "#ff8c69" : "#6ca6cd") 
                    : "#555555";
                }
                return node.group === "source" ? "#ff6347" : "#4682b4";
              }}
              nodeRelSize={6}
              // Keep node sizes consistent with a fixed value
              nodeVal={() => 0.5}
              linkDirectionalParticles={2} // Reduced from 4 to 2
              linkDirectionalParticleSpeed={(link) => link.value * 0.00005} // Reduced speed factor
              linkDirectionalParticleWidth={(link) => Math.sqrt(link.value) * 0.03} // Reduced from 0.08 to 0.03
              linkDirectionalParticleColor={() => "#ffffff"}
              linkWidth={(link) => {
                // Highlight selected links but keep width minimal
                const baseWidth = Math.max(0.5, Math.min(2, Math.sqrt(link.value) * 0.02)); // Reduced max width
                return highlightLinks.size > 0 
                  ? (highlightLinks.has(link) ? baseWidth * 1.5 : baseWidth * 0.2) // Reduced emphasis
                  : baseWidth;
              }}
              linkColor={(link) => {
                // Dim links that aren't highlighted
                if (highlightLinks.size > 0 && !highlightLinks.has(link)) {
                  return "#333333";
                }
                
                // Color links by protocol
                switch (link.protocol) {
                  case 6:
                    return "#ff0000"; // TCP - red
                  case 17:
                    return "#00ff00"; // UDP - green
                  case 1:
                    return "#0000ff"; // ICMP - blue
                  default:
                    return "#666666"; // Others - gray
                }
              }}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={clearSelection}
              linkLabel={(link) =>
                `${link.source.id} → ${link.target.id}\nBytes: ${formatBytes(link.value)}\nPort: ${link.port}\nProtocol: ${getProtocolName(link.protocol)}\nFlows: ${link.flowCount || 1}`
              }
              // Zoom controls
              enableZoomInteraction={true}
              enablePanInteraction={true}
              minZoom={0.2}
              maxZoom={5}
              cooldownTicks={100}
              cooldownTime={2000}
              // Node rendering with consistent size
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.id;
                const fontSize = 12 / globalScale;
                // Fixed node size (with minor variation for better visual hierarchy)
                const nodeSize = 5 / globalScale;
                
                // Determine node color based on selection state
                let nodeColor;
                if (highlightNodes.size > 0) {
                  nodeColor = highlightNodes.has(node) 
                    ? (node.group === "source" ? "#ff8c69" : "#6ca6cd") 
                    : "#555555";
                } else {
                  nodeColor = node.group === "source" ? "#ff6347" : "#4682b4";
                }
                
                // Draw node outline for the selected node
                if (selectedNode && selectedNode.id === node.id) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize + 2/globalScale, 0, 2 * Math.PI);
                  ctx.fillStyle = "#ffffff";
                  ctx.fill();
                }

                // Draw the node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                ctx.fillStyle = nodeColor;
                ctx.fill();

                // Only draw text if we're zoomed in enough
                if (globalScale > 0.7) {
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(label, node.x, node.y + nodeSize + fontSize);
                }
              }}
              nodeCanvasObjectMode={() => "after"}
              // Add automatic fit on load
              onEngineStop={() => {
                if (graphRef.current) {
                  graphRef.current.zoomToFit(400, 40);
                }
              }}
            />
            
            {/* Controls Overlay */}
            <div className="absolute top-4 left-4 flex space-x-2">
              <button 
                onClick={centerGraph}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
                Center
              </button>
              <button 
                onClick={toggleFullscreen}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm5 10a1 1 0 01-1 1H3a1 1 0 01-1-1v-4a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L5.414 13H7a1 1 0 011 1z" />
                  <path d="M17 16a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 012 0v4zm-5-10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0v-1.586l-2.293 2.293a1 1 0 01-1.414-1.414L14.586 7H13a1 1 0 01-1-1z" />
                </svg>
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>
            
            {/* Graph Metrics Overlay */}
            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-80 rounded p-3 text-xs text-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="font-semibold text-blue-300">Nodes</div>
                  <div>{graphMetrics.nodeCount}</div>
                </div>
                <div>
                  <div className="font-semibold text-blue-300">Connections</div>
                  <div>{graphMetrics.linkCount}</div>
                </div>
                <div>
                  <div className="font-semibold text-blue-300">Total Traffic</div>
                  <div>{formatBytes(graphMetrics.totalTraffic)}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-screen text-gray-500">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h1 className="text-2xl font-bold">Loading Network Map...</h1>
              <p className="text-gray-400 mt-2">Please wait while we process the network data</p>
            </div>
          </div>
        )}
      </div>

      <div 
        ref={sidebarRef}
        className={`${isFullscreen ? 'hidden' : 'w-1/4'} bg-gray-800 border-l border-gray-700 overflow-y-auto transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex-grow">
          <h2 className="text-xl font-bold mb-4 text-blue-300 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
            Network Map Controls
          </h2>

          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold mb-2 text-gray-300">Filters</h3>
              <button 
                onClick={resetFilters}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reset All
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1 text-gray-400">Node Search</label>
              <div className="relative">
                <input
                  type="text"
                  name="nodeSearch"
                  value={filterOptions.nodeSearch}
                  onChange={handleFilterChange}
                  placeholder="Search IP address..."
                  className="w-full border border-gray-600 rounded pl-8 pr-3 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1 text-gray-400">Protocol</label>
              <select
                name="protocol"
                value={filterOptions.protocol}
                onChange={handleFilterChange}
                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Protocols</option>
                <option value="1">ICMP (1)</option>
                <option value="6">TCP (6)</option>
                <option value="17">UDP (17)</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1 text-gray-400">
                Traffic Range (bytes)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max={filterOptions.maxTraffic}
                  value={filterOptions.minTraffic}
                  onChange={(e) => handleFilterChange({target: {name: 'minTraffic', value: e.target.value}})}
                  className="w-1/3 border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  min={filterOptions.minTraffic}
                  value={filterOptions.maxTraffic}
                  onChange={(e) => handleFilterChange({target: {name: 'maxTraffic', value: e.target.value}})}
                  className="w-1/3 border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <input
                type="range"
                name="minTraffic"
                min="0"
                max={filterOptions.maxTraffic}
                step={Math.max(1, Math.floor(filterOptions.maxTraffic / 100))}
                value={filterOptions.minTraffic}
                onChange={handleFilterChange}
                className="w-full mt-2 accent-blue-500"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1 text-gray-400">
                Time Window
              </label>
              <select
                name="timeWindow"
                value={filterOptions.timeWindow}
                onChange={handleFilterChange}
                className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="5">Last 5 Minutes</option>
                <option value="15">Last 15 Minutes</option>
                <option value="30">Last 30 Minutes</option>
                <option value="60">Last Hour</option>
                <option value="360">Last 6 Hours</option>
                <option value="1440">Last 24 Hours</option>
              </select>
            </div>
          </div>

          {selectedNode && (
            <div className="mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold mb-2 text-gray-300">Node Details</h3>
                <button 
                  onClick={clearSelection}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <p className="text-gray-200">
                  <span className="font-medium text-blue-300">IP Address:</span>{" "}
                  {selectedNode.id}
                </p>
                <p className="text-gray-200">
                  <span className="font-medium text-blue-300">Role:</span>{" "}
                  {selectedNode.group === "source" ? "Source" : "Destination"}
                </p>
                <p className="text-gray-200">
                  <span className="font-medium text-blue-300">Connections:</span>{" "}
                  {selectedNode.connectionCount || selectedNode.val}
                </p>
                <p className="text-gray-200">
                  <span className="font-medium text-blue-300">Traffic In:</span>{" "}
                  {formatBytes(selectedNode.totalTrafficIn || 0)}
                </p>
                <p className="text-gray-200">
                  <span className="font-medium text-blue-300">Traffic Out:</span>{" "}
                  {formatBytes(selectedNode.totalTrafficOut || 0)}
                </p>

                <div className="mt-2">
                  <h4 className="font-medium text-blue-300 mb-1">Recent Flows:</h4>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="py-1 text-left text-gray-400">Source</th>
                          <th className="py-1 text-left text-gray-400">Destination</th>
                          <th className="py-1 text-right text-gray-400">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNode.flows.slice(0, 8).map((flow, index) => (
                          <tr 
                            key={index}
                            className="hover:bg-gray-600 cursor-pointer"
                            onClick={() =>
                              navigate(`/flow/${flow.timestamp}`, { state: { flow } })
                            }
                          >
                            <td className="py-1 text-gray-300">{flow.src_ip}:{flow.src_port}</td>
                            <td className="py-1 text-gray-300">{flow.dst_ip}:{flow.dst_port}</td>
                            <td className="py-1 text-right text-gray-300">{formatBytes(flow.total_bytes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedNode.flows.length > 8 && (
                      <div className="text-center text-xs text-gray-400 mt-1">
                        {selectedNode.flows.length - 8} more flows...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <h3 className="font-semibold mb-2 text-gray-300">Legend</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span className="text-gray-300">Source Node</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-600 mr-2"></div>
              <span className="text-gray-300">Destination Node</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 mr-2"></div>
              <span className="text-gray-300">TCP Traffic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 mr-2"></div>
              <span className="text-gray-300">UDP Traffic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 mr-2"></div>
              <span className="text-gray-300">ICMP Traffic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-600 mr-2"></div>
              <span className="text-gray-300">Other Protocol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMap;