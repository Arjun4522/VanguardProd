import StatusCard from "./components/StatusCard"
import CountCard from "./components/CountCard"
import LogTable from "./components/LogTable"

import Header from "./components/Header"

function App() {
  return (
    <div className="bg-[#1a1a1a] h-screen">
      <Header/>
      <div className="flex gap-5 p-5">
        <StatusCard />
        <CountCard />
      </div>
      {/* list view */}
      <div className="flex justify-center">
        <LogTable/>
      </div>
    </div>
  )
}

export default App
