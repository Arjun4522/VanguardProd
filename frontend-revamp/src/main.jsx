import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'aframe'; // or import * as AFRAME from 'aframe';
import 'aframe-extras';
import 'react-force-graph';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
