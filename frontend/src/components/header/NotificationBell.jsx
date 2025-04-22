import { useState } from "react"
import { Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"

const NotificationBell = ({ notifications = [] }) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleClick = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-yellow-300 hover:text-yellow-400 transition"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-4 top-5 mt-2 w-72 bg-[#2b2b2b] border border-yellow-500/20 rounded-lg shadow-lg z-50 animate-fadeIn">
          <ul className="divide-y divide-yellow-500/10 max-h-full overflow-auto">
            {notifications.map(({ id, message, path }) => (
              <li
                key={id}
                onClick={() => handleClick(path)}
                className="p-3 text-yellow-300 hover:bg-yellow-500/10 cursor-pointer"
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default NotificationBell
