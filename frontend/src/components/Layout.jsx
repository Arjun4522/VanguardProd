import Sidebar from "./Sidebar"

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#1a1a1a] text-yellow-300">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default Layout
