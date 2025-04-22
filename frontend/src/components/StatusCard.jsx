import { useEffect, useState } from "react"
import { FaShieldAlt } from "react-icons/fa"

function StatusCard({ agentId }) {
  const [status, setStatus] = useState("Unknown")

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem("ids_config") || "{}")
    const statusApi = config.apiEndpoints?.find(e => e.includes("status")) || "/api/status"
    const statusURL = `${config.serverAddress}${statusApi}?agentId=${agentId}`

    fetch(statusURL)
      .then(res => res.json())
      .then(data => setStatus(data.status || "Unknown"))
      .catch(err => {
        console.error("Failed to fetch status:", err)
        setStatus("Offline")
      })
  }, [agentId])

  return (
    <div className="bg-[#1f1f1f]/60 backdrop-blur-lg border border-white/10 text-yellow-300 shadow-md hover:shadow-yellow-500/20 h-40 w-full rounded-2xl transition-all duration-300 p-4">
      <div className="flex flex-col justify-center h-full gap-2">
        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-yellow-200">
          <FaShieldAlt className="text-yellow-400" />
          Agent ID: <span className="font-mono">{agentId}</span>
        </div>
        <div className="text-center text-lg mt-2">
          Status:{" "}
          <span className={`font-bold ${status === "Active" ? "text-green-400" : "text-red-400"}`}>
            {status}
          </span>
        </div>
        <p className="text-sm text-center text-yellow-500 italic">
          Monitoring interface in real-time
        </p>
      </div>
    </div>
  )
}

export default StatusCard
