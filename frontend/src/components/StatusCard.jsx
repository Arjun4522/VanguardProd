import { useState } from "react"
import { FaShieldAlt } from "react-icons/fa"

function StatusCard() {
  const [status, setStatus] = useState("Not Active")

  return (
    <div className="bg-[#1f1f1f]/60 backdrop-blur-lg border border-white/10 text-yellow-300 shadow-md hover:shadow-yellow-500/20 h-40 w-full rounded-2xl transition-all duration-300 p-4">
      <div className="flex flex-col justify-center h-full gap-2">
        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-yellow-200">
          <FaShieldAlt className="text-yellow-400" />
          IDS Agent ID: <span className="font-mono">AD321QW21</span>
        </div>
        <div className="text-center text-lg mt-2">
          Status: <span className={`font-bold ${status === "Active" ? "text-green-400" : "text-red-400"}`}>{status}</span>
        </div>
        <p className="text-sm text-center text-yellow-500 italic">Monitoring interface in real-time</p>
      </div>
    </div>
  )
}

export default StatusCard
