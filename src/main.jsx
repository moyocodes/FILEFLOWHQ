import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { isNative, isExtension } from './utils/platform'
import './index.css'
import { resetOnNewDeploy } from './utils/deployReset'

resetOnNewDeploy()

// Restore theme before paint to avoid a flash of the wrong theme: the visitor's own choice
// (ThemeToggle) if they made one, otherwise the system's light or dark mode, followed live.
let savedTheme = null
try {
  savedTheme = localStorage.getItem('ffhq-theme')
} catch {
  // storage blocked: follow the system
}
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)')
document.documentElement.classList.toggle('dark', savedTheme ? savedTheme === 'dark' : systemDark?.matches !== false)
systemDark?.addEventListener?.('change', (e) => {
  let chosen = null
  try {
    chosen = localStorage.getItem('ffhq-theme')
  } catch {
    // storage blocked: follow the system
  }
  if (!chosen) document.documentElement.classList.toggle('dark', e.matches)
})

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
