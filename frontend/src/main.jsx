import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import './index.css'
import App from './App.jsx'
import LogDetails from './pages/LogDetails.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/log-details" element={<LogDetails />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  </StrictMode>,
)
