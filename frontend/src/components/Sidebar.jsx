import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { FaHome, FaTable, FaCog, FaBars } from "react-icons/fa"

function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768)

  const isActive = (path) =>
    location.pathname === path
      ? "bg-yellow-500 text-black"
      : "hover:bg-yellow-500/10 text-yellow-300"

  const navItems = [
    { label: "Home", icon: <FaHome />, path: "/" },
    { label: "Network Table", icon: <FaTable />, path: "/network" },
    { label: "Settings", icon: <FaCog />, path: "/settings" },
  ]

  return (
    <div
      className={`h-screen p-4 bg-[#1f1f1f]/80 border-r border-white/10 shadow-md backdrop-blur-md transition-all duration-300 ${
        collapsed ? "w-20" : "w-60"
      }`}
    >
      <div className="flex justify-between items-center mb-8">
        {!collapsed && <h2 className="text-2xl font-bold text-yellow-400">IDS</h2>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-yellow-400 hover:text-yellow-500 transition-all flex items-center justify-center w-10 h-10 rounded-full bg-[#222222] hover:bg-[#333333] focus:outline-none"
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <FaBars />
        </button>
      </div>

      <nav className="flex flex-col gap-4">
        {navItems.map(({ label, icon, path }) => (
          <Link
            to={path}
            key={path}
            title={label}
            aria-label={label}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isActive(path)
            } ${collapsed ? "justify-center" : ""}`}
          >
            {icon}
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar
