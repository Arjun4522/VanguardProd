import { useEffect, useState } from "react";
import SettingsTabs from "../components/settingItems/SettingsTabs";
import ServerSettings from "../components/settingItems/ServerSettings";
import GrafanaSettings from "../components/settingItems/GrafanaSettings";
import AlertSettings from "../components/settingItems/AlertSettings";
import NotificationSettings from "../components/settingItems/NotificationSettings";
import AddAgentForm from "../components/settingItems/AddAgentForm";

const tabComponents = {
  "Server Settings": ServerSettings,
  "Grafana Settings": GrafanaSettings,
  "Alert Settings": AlertSettings,
  "Notification Settings": NotificationSettings,
  "Add Agent": AddAgentForm,
};

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Server Settings");
  const [config, setConfig] = useState({
    grafanaAddress: "",
    serverAddress: "",
    apiEndpoints: "",
    alertThreshold: "",
    refreshInterval: "",
    emailAlerts: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ids_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error("Failed to parse config from localStorage", err);
    }
  }, []);

  const saveConfig = (updated) => {
    const newConfig = { ...config, ...updated };
    setConfig(newConfig);
    localStorage.setItem("ids_config", JSON.stringify(newConfig));
  };

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="min-h-screen bg-[#121212] text-yellow-300 pt-10 px-4">
      <div className="max-w-4xl mx-auto">
        <SettingsTabs currentTab={activeTab} onTabChange={setActiveTab} />
        <div className="mt-6">
          <ActiveComponent config={config} onChange={saveConfig} />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
