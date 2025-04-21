import { useState, useEffect } from "react"

function SettingsPage() {
  const [grafanaAddress, setGrafanaAddress] = useState("")
  const [alertThreshold, setAlertThreshold] = useState("")
  const [refreshInterval, setRefreshInterval] = useState("")
  const [emailAlerts, setEmailAlerts] = useState(false)

  // Load from "config.json" on mount (simulated via localStorage)
  useEffect(() => {
    const config = localStorage.getItem("ids_config")
    if (config) {
      const parsed = JSON.parse(config)
      setGrafanaAddress(parsed.grafanaAddress || "")
      setAlertThreshold(parsed.alertThreshold || "")
      setRefreshInterval(parsed.refreshInterval || "")
      setEmailAlerts(parsed.emailAlerts || false)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const configData = {
      grafanaAddress,
      alertThreshold,
      refreshInterval,
      emailAlerts
    }

    // Save to "config.json" in localStorage
    localStorage.setItem("ids_config", JSON.stringify(configData))
    alert("Settings saved to config.json successfully!")
  }

  return (
    <div className="min-h-screen bg-[#121212] text-yellow-300 flex justify-center items-start pt-10 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1f1f1f]/60 backdrop-blur-md p-8 rounded-2xl shadow-md w-full max-w-xl border border-white/10"
      >
        <h2 className="text-3xl font-bold mb-6 text-yellow-400 text-center">Agent Configuration</h2>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Grafana Address</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="http://your-grafana-instance"
            value={grafanaAddress}
            onChange={(e) => setGrafanaAddress(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Alert Threshold (MB/sec)</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="e.g. 100"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Agent Refresh Interval (sec)</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="e.g. 10"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
          />
        </div>

        <div className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="emailAlerts"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          <label htmlFor="emailAlerts" className="text-sm font-semibold">Enable Email Alerts</label>
        </div>

        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded transition-all"
        >
          Save Settings
        </button>
      </form>
    </div>
  )
}

export default SettingsPage
