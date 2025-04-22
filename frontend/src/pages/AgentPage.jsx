import { useParams } from "react-router-dom"
import StatusCard from "../components/StatusCard"
import CountCard from "../components/CountCard"
import LogTable from "../components/LogTable"
import Header from "../components/Header"

function AgentPage() {
  const { agentId } = useParams()

  return (
    <div className="flex flex-col gap-4 flex-grow">
      <Header />
      <div className="p-5 text-yellow-200">
        <h1 className="text-2xl font-bold mb-4">Agent: {agentId}</h1>
        <div className="flex gap-5">
          <StatusCard agentId={agentId} />
          <CountCard agentId={agentId} />
        </div>
        <div className="mt-5">
          <LogTable isHome={false} agentId={agentId} />
        </div>
      </div>
    </div>
  )
}

export default AgentPage
