import { useState } from "react"
import { FaArrowUp, FaArrowDown } from "react-icons/fa"

function CountCard() {
  const [inCount, setInCount] = useState(0)
  const [outCount, setOutCount] = useState(0)

  return (
    <div className="bg-[#1f1f1f]/60 backdrop-blur-md border border-white/10 text-yellow-300 shadow-md hover:shadow-yellow-500/20 h-40 w-full rounded-2xl transition-all duration-300 p-4">
      <div className="flex flex-col justify-center h-full gap-4">
        <div className="flex justify-between items-center text-xl">
          <span className="flex items-center gap-2">
            <FaArrowDown className="text-green-400" />
            Incoming Traffic:
          </span>
          <span className="text-green-300 font-semibold">{inCount} MB/sec</span>
        </div>
        <div className="flex justify-between items-center text-xl">
          <span className="flex items-center gap-2">
            <FaArrowUp className="text-red-400" />
            Outgoing Traffic:
          </span>
          <span className="text-red-300 font-semibold">{outCount} MB/sec</span>
        </div>
      </div>
    </div>
  )
}

export default CountCard
