import { useState } from "react";

function AddAgentForm({ onChange }) {
  const [newAgent, setNewAgent] = useState({
    id: "",
    ip: "",
    status: "offline",
  });

  const handleInputChange = (field, value) => {
    setNewAgent((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAgent = () => {
    onChange(newAgent);
    setNewAgent({ id: "", ip: "", status: "offline" }); // Reset after adding
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-sm font-semibold">Agent ID</label>
        <input
          type="text"
          value={newAgent.id}
          onChange={(e) => handleInputChange("id", e.target.value)}
          className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
          placeholder="Agent ID"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-semibold">Agent IP</label>
        <input
          type="text"
          value={newAgent.ip}
          onChange={(e) => handleInputChange("ip", e.target.value)}
          className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100 placeholder-yellow-600"
          placeholder="Agent IP"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-semibold">Agent Status</label>
        <select
          value={newAgent.status}
          onChange={(e) => handleInputChange("status", e.target.value)}
          className="w-full p-2 rounded bg-[#2a2a2a] border border-yellow-400 text-yellow-100"
        >
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <button
        onClick={handleAddAgent}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded transition-all"
      >
        Add Agent
      </button>
    </div>
  );
}

export default AddAgentForm;
