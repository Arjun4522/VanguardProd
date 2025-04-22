import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MonitorDot } from "lucide-react"

function AgentGrid({ agents }) {
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()

  // Filter agents based on the search query (by id or ip)
  const filteredAgents = agents.filter(agent => 
    agent.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    agent.ip.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by Agent ID or IP"
          className="w-full p-2 bg-[#1f1f1f] border border-white/20 rounded-lg text-yellow-400 placeholder:text-white/50"
        />
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.length > 0 ? (
          filteredAgents.map(agent => (
            <div
              key={agent.id}
              onClick={() => navigate(`/agent/${agent.id}`)}
              className="cursor-pointer p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f1f1f]/70 to-[#292929]/70 backdrop-blur-md shadow-md hover:shadow-yellow-400/20 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-yellow-300"><span className="text-white">ID:</span> {agent.id}</h3>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    agent.status === "online"
                      ? "bg-green-400/20 text-green-300"
                      : "bg-red-400/20 text-red-300"
                  }`}
                >
                  <MonitorDot className="w-3 h-3" />
                  {agent.status}
                </span>
              </div>

              <p className="text-white/80 mb-1">
                <span className="font-medium text-white">IP:</span> {agent.ip}
              </p>

              <p className="text-white/60 text-sm italic">
                Last seen: {new Date(agent.lastSeen).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-yellow-300 text-center col-span-full">No agents found matching your search.</p>
        )}
      </div>
    </div>
  )
}

export default AgentGrid
