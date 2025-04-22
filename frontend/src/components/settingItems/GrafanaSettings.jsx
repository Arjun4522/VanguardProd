function GrafanaSettings({ config, onChange }) {
    const handleInputChange = (field, value) => {
      onChange({ [field]: value });
    };
  
    return (
      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-semibold">Grafana Address</label>
          <input
            type="text"
            value={config.grafanaAddress}
            onChange={(e) => handleInputChange("grafanaAddress", e.target.value)}
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="http://your-grafana-instance"
          />
        </div>
      </div>
    );
  }
  
  export default GrafanaSettings;
  