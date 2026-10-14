import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { isNative, isExtension } from './utils/platform'
import './index.css'
import { resetOnNewDeploy } from './utils/deployReset'

resetOnNewDeploy()

// Restore theme before paint to avoid a flash of the wrong theme. Dark is the
// default look (it matches the brand video); light only when chosen.
const savedTheme = localStorage.getItem('theme')
if (savedTheme !== 'light') {
  document.documentElement.classList.add('dark')
}

// Web keeps clean URLs (e.g. /tools/image-converter) for SEO; the host has a
// catch-all rewrite to index.html (see vercel.json). Native builds
// load from file:// where those rewrites don't exist, so they use HashRouter.
// The Chrome extension loads from chrome-extension:// and needs it too.
const Router = isNative || isExtension ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
      {!isExtension && <Analytics />}
    </Router>
  </React.StrictMode>
)
