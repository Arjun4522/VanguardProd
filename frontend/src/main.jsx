import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import "./index.css"

import App from "./App.jsx"
import LogDetails from "./pages/LogDetails.jsx"
import SettingsPage from "./pages/SettingsPage.jsx"
import NetworkTablePage from "./pages/NetworkTablePage.jsx"
import AgentPage from "./pages/AgentPage.jsx"
import Layout from "./components/Layout.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/network" element={<NetworkTablePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/log-details" element={<LogDetails />} />
          <Route path="/agent/:agentId" element={<AgentPage />} />
        </Routes>
      </Layout>
    </Router>
  </StrictMode>
)
