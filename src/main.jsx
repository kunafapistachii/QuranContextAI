import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Imported for its side effect: starts listening for `beforeinstallprompt` at module load,
// since Chromium can fire it before React has mounted.
import './lib/pwaInstall.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
