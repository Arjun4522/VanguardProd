import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux'; // <-- ADD this
import { selectFlows } from '../redux/slices/flowsSlice';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const LogMonitor = () => {
  const flows = useSelector(selectFlows); // <-- UPDATE this line
  const [filteredFlows, setFilteredFlows] = useState([]);
  const [filters, setFilters] = useState({
    srcIp: '',
    dstIp: '',
    protocol: '',
    minBytes: '',
    maxBytes: '',
    port: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    direction: 'desc'
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedFlows, setPaginatedFlows] = useState([]);
  
  const navigate = useNavigate();

  // Filter and sort flows
  useEffect(() => {
    let result = [...flows];
    
    // Apply filters
    if (filters.srcIp) {
      result = result.filter(flow => flow.src_ip.includes(filters.srcIp));
    }
    if (filters.dstIp) {
      result = result.filter(flow => flow.dst_ip.includes(filters.dstIp));
    }
    if (filters.protocol) {
      result = result.filter(flow => flow.protocol === parseInt(filters.protocol));
    }
    if (filters.minBytes) {
      result = result.filter(flow => flow.total_bytes >= parseInt(filters.minBytes));
    }
    if (filters.maxBytes) {
      result = result.filter(flow => flow.total_bytes <= parseInt(filters.maxBytes));
    }
    if (filters.port) {
      const port = parseInt(filters.port);
      result = result.filter(flow => flow.src_port === port || flow.dst_port === port);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredFlows(result);
    setTotalPages(Math.ceil(result.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters or sorting change
  }, [flows, filters, sortConfig, itemsPerPage]);

  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedFlows(filteredFlows.slice(startIndex, endIndex));
  }, [filteredFlows, currentPage, itemsPerPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      srcIp: '',
      dstIp: '',
      protocol: '',
      minBytes: '',
      maxBytes: '',
      port: ''
    });
  };

  const handleSort = (key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const viewFlowDetails = (flow) => {
    navigate(`/flow/${flow.timestamp}`, { state: { flow } });
  };

  const getProtocolName = (protocol) => {
    switch (protocol) {
      case 1: return 'ICMP';
      case 6: return 'TCP';
      case 17: return 'UDP';
      default: return `Protocol ${protocol}`;
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
  };

  // Generate pagination controls
  const renderPaginationControls = () => {
    const pages = [];
    
    // Always show first page, last page, current page, and one page before and after current
    const pagesToShow = new Set([
      1, 
      totalPages, 
      currentPage, 
      Math.max(1, currentPage - 1), 
      Math.min(totalPages, currentPage + 1)
    ]);
    
    const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
    
    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      
      // Add ellipsis if there's a gap
      if (i > 0 && sortedPages[i] > sortedPages[i-1] + 1) {
        pages.push(
          <span key={`ellipsis-${i}`} className="px-3 py-1 text-gray-500">...</span>
        );
      }
      
      // Add page button
      pages.push(
        <button
          key={page}
          onClick={() => goToPage(page)}
          className={`px-3 py-1 rounded ${
            currentPage === page 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {page}
        </button>
      );
    }
    
    return pages;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
      <h1 className="text-2xl font-bold mb-6 text-white">Network Flow Log Monitor</h1>

      <div className="bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filters */}
          {['srcIp', 'dstIp', 'minBytes', 'maxBytes', 'port'].map((field, idx) => (
            <div key={idx}>
              <label className="block text-sm mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type={field.includes('Bytes') || field === 'port' ? 'number' : 'text'}
                name={field}
                value={filters[field]}
                onChange={handleFilterChange}
                placeholder={field.includes('Ip') ? '0.0.0.0' : '0'}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm mb-1">Protocol</label>
            <select
              name="protocol"
              value={filters.protocol}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            >
              <option value="">Any Protocol</option>
              <option value="1">ICMP (1)</option>
              <option value="6">TCP (6)</option>
              <option value="17">UDP (17)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                {['Timestamp', 'Source IP', 'Destination IP', 'Protocol', 'Bytes', 'Packets', 'Actions'].map((header, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={header !== 'Actions' ? () => handleSort(header.toLowerCase().replace(' ', '_')) : undefined}
                  >
                    <div className="flex items-center">
                      {header} {getSortIcon(header.toLowerCase().replace(' ', '_'))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {paginatedFlows.length > 0 ? (
                paginatedFlows.map((flow, index) => (
                  <tr
                    key={`${flow.timestamp}-${index}`}
                    className="hover:bg-gray-700 cursor-pointer"
                    onClick={() => viewFlowDetails(flow)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {format(new Date(flow.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {flow.src_ip}:{flow.src_port}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {flow.dst_ip}:{flow.dst_port}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getProtocolName(flow.protocol)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {flow.total_bytes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {flow.total_packets.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-indigo-400 hover:text-indigo-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewFlowDetails(flow);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-400">
                    No matching flows found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <span className="text-sm text-gray-400">Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
          >
            {[10, 25, 50, 100].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="mx-2 flex space-x-1">
            {renderPaginationControls()}
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        
        <div className="text-sm text-gray-400 mt-4 md:mt-0">
          Showing {paginatedFlows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of {filteredFlows.length} flows
        </div>
      </div>
    </div>
  );
};

export default LogMonitor;