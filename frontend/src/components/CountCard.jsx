import { useEffect, useState } from "react"
import { FaArrowUp, FaArrowDown } from "react-icons/fa"

function CountCard({ agentId }) {
  const [inCount, setInCount] = useState(0)
  const [outCount, setOutCount] = useState(0)

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem("ids_config") || "{}")
    let base = config.serverAddress || "http://localhost:3001"
    if (!base.endsWith("/")) base += "/"

    const statsApi = config.apiEndpoints?.find(e => e.includes("stats")) || "api/stats"
    const statsURL = `${base}${statsApi}?agentId=${agentId}`

    fetch(statsURL)
      .then(res => res.json())
      .then(data => {
        setInCount(data.incoming || 0)
        setOutCount(data.outgoing || 0)
      })
      .catch(err => console.error("Failed to fetch stats:", err))
  }, [agentId])

  return (
    <div className="bg-[#1f1f1f]/60 backdrop-blur-md border border-white/10 text-yellow-300 shadow-md hover:shadow-yellow-500/20 h-40 w-full rounded-2xl transition-all duration-300 p-4">
      <div className="flex flex-col justify-center h-full gap-4">
        <div className="flex justify-between items-center text-xl">
          <span className="flex items-center gap-2">
            <FaArrowDown className="text-green-400" />
            Incoming:
          </span>
          <span className="text-green-300 font-semibold">{inCount} MB/sec</span>
        </div>
        <div className="flex justify-between items-center text-xl">
          <span className="flex items-center gap-2">
            <FaArrowUp className="text-red-400" />
            Outgoing:
          </span>
          <span className="text-red-300 font-semibold">{outCount} MB/sec</span>
        </div>
      </div>
    </div>
  )
}

export default CountCard
