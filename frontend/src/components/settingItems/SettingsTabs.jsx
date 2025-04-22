function SettingsTabs({ currentTab, onTabChange }) {
    const tabs = [
      "Server Settings",
      "Grafana Settings",
      "Alert Settings",
      "Notification Settings",
      "Add Agent"
    ];
  
    return (
      <div className="flex justify-center mb-6 gap-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm backdrop-blur-md ${
              currentTab === tab
                ? "bg-yellow-500 text-black"
                : "bg-[#2a2a2a] text-yellow-300 hover:bg-yellow-600 hover:text-black"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  }
  
  export default SettingsTabs;
  