/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

function LogTable({ isHome, agentId }) {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({
    protocol: "",
    src: "",
    dst: "",
    after: "",
    agentId: ""
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  const navigate = useNavigate()

  const fetchLogs = () => {
    const config = JSON.parse(localStorage.getItem("ids_config") || "{}")
    const logsApi = config.apiEndpoints?.find(e => e.includes("logs")) || "/api/logs"
    const baseURL = `${config.serverAddress}${logsApi}`

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      protocol: filters.protocol,
      src: filters.src,
      dst: filters.dst,
      after: filters.after,
      ...(agentId ? { agentId } : filters.agentId ? { agentId: filters.agentId } : {})
    })

    fetch(`${baseURL}?${params}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || [])
        setTotalPages(data.totalPages || 1)
      })
      .catch(err => console.error("Failed to fetch logs:", err))
  }

  useEffect(() => {
    if (!isHome) return
    fetchLogs()
  }, [page, pageSize, filters])

  useEffect(() => {
    if (!isHome) fetchLogs()
  }, [agentId])

  const handleRowClick = (log) => {
    const query = new URLSearchParams(log).toString()
    navigate(`/log-details?${query}`)
  }

  const handlePageChange = (direction) => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setPage(prev => Math.max(1, Math.min(totalPages, prev + direction)))
  }

  const displayedLogs = isHome ? logs : logs.slice(0, 6)

  return (
    <motion.div
      layout
      className="overflow-x-auto w-full bg-[#1f1f1f]/60 backdrop-blur-lg border border-white/10 text-white shadow-md rounded-2xl p-4"
    >
      <h2 className="text-xl font-bold text-yellow-400 mb-4 text-center">
        {isHome ? "Recent Logs" : `Logs for ${agentId}`}
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 text-sm">
        <input type="text" placeholder="Filter by Protocol" value={filters.protocol}
          onChange={e => setFilters(prev => ({ ...prev, protocol: e.target.value }))}
          className="bg-black/30 border border-white/10 p-2 rounded-lg" />
        <input type="text" placeholder="Source IP" value={filters.src}
          onChange={e => setFilters(prev => ({ ...prev, src: e.target.value }))}
          className="bg-black/30 border border-white/10 p-2 rounded-lg" />
        <input type="text" placeholder="Destination IP" value={filters.dst}
          onChange={e => setFilters(prev => ({ ...prev, dst: e.target.value }))}
          className="bg-black/30 border border-white/10 p-2 rounded-lg" />
        <input type="datetime-local" value={filters.after}
          onChange={e => setFilters(prev => ({ ...prev, after: e.target.value }))}
          className="bg-black/30 border border-white/10 p-2 rounded-lg col-span-full sm:col-span-2" />
        {isHome && (
          <input type="text" placeholder="Filter by Agent ID" value={filters.agentId}
            onChange={e => setFilters(prev => ({ ...prev, agentId: e.target.value }))}
            className="bg-black/30 border border-white/10 p-2 rounded-lg" />
        )}
      </div>

      {/* Page size dropdown */}
      {isHome && (
        <div className="mb-2 flex items-center gap-2">
          <label className="text-sm">Page Size:</label>
          <select
            value={pageSize}
            onChange={e => setPageSize(parseInt(e.target.value))}
            className="bg-black/40 border border-white/10 p-1 rounded-md"
          >
            {[6, 10, 20, 50].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <table className="table-auto w-full text-sm">
        <thead>
          <tr className="text-yellow-500 text-left border-b border-white/10">
            <th className="p-2">Agent ID</th>
            <th className="p-2">Source IP</th>
            <th className="p-2">Destination IP</th>
            <th className="p-2">Protocol</th>
            <th className="p-2">Timestamp</th>
          </tr>
        </thead>
        <AnimatePresence initial={false}>
          <tbody>
            {displayedLogs.map((log, index) => (
              <motion.tr
                key={index}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleRowClick(log)}
                className="border-b border-white/5 hover:bg-yellow-500/10 cursor-pointer"
              >
                <td className="p-2 font-mono">{log.agentId || agentId || "?"}</td>
                <td className="p-2 font-mono">{log.src}</td>
                <td className="p-2 font-mono">{log.dst}</td>
                <td className="p-2">{log.protocol}</td>
                <td className="p-2 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
              </motion.tr>
            ))}
            {displayedLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-white/50 italic">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </AnimatePresence>
      </table>

      {/* Pagination */}
      {isHome && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => handlePageChange(-1)}
            disabled={page === 1}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <FaChevronLeft />
          </button>
          <span className="text-sm text-yellow-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === totalPages}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default LogTable
