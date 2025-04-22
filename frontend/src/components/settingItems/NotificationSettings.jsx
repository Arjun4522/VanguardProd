function NotificationSettings({ config, onChange }) {
    const handleInputChange = (field, value) => {
      onChange({ [field]: value });
    };
  
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="emailAlerts"
            checked={config.emailAlerts}
            onChange={(e) => handleInputChange("emailAlerts", e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          <label htmlFor="emailAlerts" className="text-sm font-semibold">Enable Email Alerts</label>
        </div>
      </div>
    );
  }
  
  export default NotificationSettings;
  