function AlertSettings({ config, onChange }) {
    const handleInputChange = (field, value) => {
      onChange({ [field]: value });
    };
  
    return (
      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-semibold">Alert Threshold (MB/sec)</label>
          <input
            type="number"
            value={config.alertThreshold}
            onChange={(e) => handleInputChange("alertThreshold", e.target.value)}
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="e.g. 100"
          />
        </div>
  
        <div>
          <label className="block mb-1 text-sm font-semibold">Agent Refresh Interval (sec)</label>
          <input
            type="number"
            value={config.refreshInterval}
            onChange={(e) => handleInputChange("refreshInterval", e.target.value)}
            className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
            placeholder="e.g. 10"
          />
        </div>
      </div>
    );
  }
  
  export default AlertSettings;
  