import { useEffect, useState } from "react"

function ServerSettings({ config, onChange }) {
  const [endpointsString, setEndpointsString] = useState("")

  useEffect(() => {
    if (Array.isArray(config.apiEndpoints)) {
      setEndpointsString(config.apiEndpoints.join(", "))
    }
  }, [config.apiEndpoints])

  const handleInputChange = (field, value) => {
    if (field === "serverAddress") {
      onChange({ serverAddress: value })
    } else if (field === "apiEndpoints") {
      setEndpointsString(value)
    }
  }

  const handleBlur = () => {
    const parsed = endpointsString
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
    onChange({ apiEndpoints: parsed })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-sm font-semibold">Server Address</label>
        <input
          type="text"
          value={config.serverAddress}
          onChange={(e) => handleInputChange("serverAddress", e.target.value)}
          className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
          placeholder="http://your-server-address"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-semibold">API Endpoints</label>
        <input
          type="text"
          value={endpointsString}
          onChange={(e) => handleInputChange("apiEndpoints", e.target.value)}
          onBlur={handleBlur}
          className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
          placeholder="/api/logs, /api/stats"
        />
        <p className="text-xs text-yellow-600 mt-1">Separate multiple APIs with commas.</p>
      </div>
    </div>
  )
}

export default ServerSettings
