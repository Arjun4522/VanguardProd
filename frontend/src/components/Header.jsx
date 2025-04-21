import { useNavigate } from "react-router-dom"
import { FaCog } from "react-icons/fa"

function Header() {
  const navigate = useNavigate()

  const handleSettingsClick = () => {
    navigate("/settings")
  }

  return (
    <div className="relative bg-[#222222] p-5 shadow-md backdrop-blur-sm rounded-b-2xl flex items-center justify-center">
      <h1 className="text-3xl font-bold text-yellow-400 text-center">
        Network Log
      </h1>

      {/* Settings Button */}
      <button
        onClick={handleSettingsClick}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-yellow-300 hover:text-yellow-500 transition-all"
        title="Settings"
      >
        <FaCog className="text-2xl" />
      </button>
    </div>
  )
}

export default Header
