import { useNavigate } from "react-router-dom"
import { FaArrowRight } from "react-icons/fa"

function LogBox({ src, dst, protocol, timestamp }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/log-details?src=${encodeURIComponent(src)}&dst=${encodeURIComponent(dst)}`)
  }

  return (
    <div
      className="grid grid-cols-5 gap-4 py-3 px-4 hover:bg-yellow-500/10 hover:shadow-md rounded-lg transition-all duration-200 cursor-pointer items-center text-yellow-300 border-b border-yellow-500/10"
      onClick={handleClick}
    >
      <div className="truncate">{src}</div>
      <div className="flex items-center gap-2 truncate">
        <FaArrowRight className="text-yellow-400" />
        <span>{dst}</span>
      </div>
      <div className="uppercase text-sm font-medium">{protocol}</div>
      <div className="text-sm font-mono">{timestamp}</div>
      <div className="text-sm italic text-yellow-400">View Details</div>
    </div>
  )
}

export default LogBox
