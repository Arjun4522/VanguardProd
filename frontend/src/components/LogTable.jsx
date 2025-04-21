import { useState } from "react"
import LogBox from "./logItems/LogBox"

const logData = [
  { src: "192.168.0.10", dst: "8.8.8.8", protocol: "TCP", timestamp: "2025-04-22 09:30:12" },
  { src: "192.168.0.15", dst: "1.1.1.1", protocol: "UDP", timestamp: "2025-04-22 09:30:45" },
  { src: "10.0.0.5", dst: "172.217.0.0", protocol: "ICMP", timestamp: "2025-04-22 09:31:05" },
]

function LogTable() {
  const [filterProtocol, setFilterProtocol] = useState("")
  const [filterSrc, setFilterSrc] = useState("")

  const filteredLogs = logData.filter(log =>
    (filterProtocol ? log.protocol === filterProtocol : true) &&
    (filterSrc ? log.src.includes(filterSrc) : true)
  )

  return (
    <div className="bg-[#1f1f1f]/60 backdrop-blur-lg border border-white/10 text-yellow-300 shadow-md hover:shadow-yellow-500/20 w-[97%] rounded-2xl transition-all duration-300 p-6 max-h-[600px] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">
        Network Traffic Logs
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-yellow-400">Filter by Protocol:</label>
          <select
            className="bg-[#2a2a2a] text-yellow-200 border border-yellow-400 px-2 py-1 rounded"
            value={filterProtocol}
            onChange={(e) => setFilterProtocol(e.target.value)}
          >
            <option value="">All</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm text-yellow-400">Filter by Source IP:</label>
          <input
            type="text"
            placeholder="Enter IP..."
            value={filterSrc}
            onChange={(e) => setFilterSrc(e.target.value)}
            className="bg-[#2a2a2a] text-yellow-200 border border-yellow-400 px-2 py-1 rounded placeholder-yellow-600"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-5 gap-4 text-yellow-500 font-semibold border-b border-yellow-500/30 pb-2 mb-4 text-sm uppercase tracking-wide">
        <div>Source</div>
        <div>Destination</div>
        <div>Protocol</div>
        <div>Timestamp</div>
        <div>Action</div>
      </div>

      {/* Filtered Log Entries */}
      {filteredLogs.length > 0 ? (
        filteredLogs.map((log, index) => (
          <LogBox key={index} {...log} />
        ))
      ) : (
        <p className="text-center text-yellow-500 italic">No logs match the filter.</p>
      )}
    </div>
  )
}

export default LogTable
