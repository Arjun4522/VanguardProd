import LogTable from "../components/LogTable"
import Header from "../components/Header"

function NetworkTablePage() {
  return (
    <div>
      <Header />
      <div className="flex justify-center p-4">
        <LogTable isHome={true} />
      </div>
    </div>
  )
}

export default NetworkTablePage
