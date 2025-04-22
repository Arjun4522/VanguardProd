import NotificationBell from "./header/NotificationBell"

function Header() {
  const notifications = [
    { id: 1, message: "New log entry detected", path: "/logs?highlight=latest" },
    { id: 2, message: "Agent JU98DE17CD went offline", path: "/agent/JU98DE17CD" },
    { id: 3, message: "High traffic alert on NH65GFER12", path: "/alerts/NH65GFER12" },
    { id: 4, message: "New agent added: AB12CD34EF", path: "/agent/AB12CD34EF" },
    { id: 5, message: "New network configuration applied", path: "/settings/network" },
    { id: 6, message: "System update available", path: "/updates" },
    { id: 7, message: "New feature added: Dark Mode", path: "/features/dark-mode" },
    { id: 8, message: "Scheduled maintenance on 2024-01-15", path: "/maintenance" },
    { id: 9, message: "Backup completed successfully", path: "/backups" },
    { id: 10, message: "Security patch applied", path: "/security" },
    { id: 11, message: "New user registered: admin", path: "/users/admin" },
    { id: 12, message: "Password changed for user: admin", path: "/users/admin" },
    { id: 13, message: "New device detected on network", path: "/devices/new" },
    { id: 14, message: "Network scan completed", path: "/scans/completed" },
    { id: 15, message: "New alert rule created", path: "/alerts/rules/new" },
  ]

  return (
    <div className="relative bg-[#222222] p-5 shadow-md backdrop-blur-sm flex items-center justify-between z-10">
      <h1 className="text-3xl font-bold text-yellow-400 text-center flex-1">
        Network Log
      </h1>
      <NotificationBell notifications={notifications} />
    </div>
  )
}

export default Header
