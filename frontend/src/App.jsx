import { useEffect, useState } from "react"
import Header from "./components/Header"
import AgentGrid from "./components/AgentGrid"

function App() {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem("ids_config") || "{}")
    const agentsApi = config.apiEndpoints?.find(e => e.includes("agents")) || "/api/agents"
    const agentsURL = `${config.serverAddress}${agentsApi}`

    fetch(agentsURL)
      .then(res => res.json())
      .then(data => setAgents(data))
      .catch(err => console.error("Failed to fetch agents:", err))
  }, [])

  return (
    <div className="flex flex-col gap-4 flex-grow">
      <Header />
      <AgentGrid agents={agents} />
    </div>
  )
}

export default App
