import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { track } from '@vercel/analytics'
import TopNav from './components/TopNav.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import Home from './pages/Home.jsx'
import ToolPage from './pages/ToolPage.jsx'
import Privacy from './pages/Privacy.jsx'
import Contact from './pages/Contact.jsx'
import { tools } from './toolsConfig.js'
import { studioApps, studioPath } from './studioApps.js'
import { StudioHome, StudioAppPage } from './pages/Studio.jsx'
import { EmailGateProvider } from './context/EmailGateContext.jsx'
import { UsageProvider } from './context/UsageContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import EmailGateModal from './components/EmailGateModal.jsx'
import ToastStack from './components/ToastStack.jsx'
import ContactChat from './components/ContactChat.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import StatsDashboard from './pages/StatsDashboard.jsx'
import PreviewModal from './components/PreviewModal.jsx'
import { PreviewProvider } from './context/PreviewContext.jsx'
import { trackView } from './utils/analytics.js'

/**
 * Page shell: sticky top nav, the routed page, and a footer. The whole
 * document scrolls normally (no fixed-height inner scroll panes), which keeps
 * iOS Safari's address bar, rubber-banding and keyboard behaving.
 */
function Shell() {
  const location = useLocation()
  // On any Studio editor the site's nav and footer step aside: the FileFlowHQ Studio bar
  // (Studio.jsx) is the page's only bar.
  const onEditor = studioApps.some((app) => location.pathname === studioPath(app))
  // Rebranded editors render outside <main> (kept mounted, below); the others are routed in it.
  const current = studioApps.find((app) => app.branded && location.pathname === studioPath(app))
  const immersive = Boolean(current)
  // Rebranded editors opened this visit stay mounted (hidden) when the visitor goes elsewhere on
  // the site, so their open documents and unsaved edits are still there on return.
  const [kept, setKept] = useState([])
  const keptIds = current && !kept.includes(current.id) ? [...kept, current.id] : kept
  useEffect(() => {
    if (current) setKept((ids) => (ids.includes(current.id) ? ids : [...ids, current.id]))
  }, [current])

  useEffect(() => {
    track('pageview', { path: location.pathname })
    if (!location.pathname.startsWith('/admin')) trackView(location.pathname)
  }, [location.pathname])

  // New page → top. A #hash (e.g. "/#tools") scrolls to that section instead.
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {!onEditor && <TopNav />}
      <main className={immersive ? 'hidden' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<Home />} />
          {tools.map((tool) => (
            <Route key={tool.id} path={tool.path} element={<ToolPage key={tool.id} tool={tool} />} />
          ))}
          <Route path="/studio" element={<StudioHome />} />
          {studioApps.map((app) => (
            <Route
              key={app.id}
              path={studioPath(app)}
              element={app.branded ? null : <StudioAppPage key={app.id} app={app} />}
            />
          ))}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/stats" element={<StatsDashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {keptIds.map((id) => {
        const app = studioApps.find((a) => a.id === id)
        return <StudioAppPage key={id} app={app} active={current?.id === id} />
      })}
      {!onEditor && <SiteFooter />}

      <PreviewModal />
      <EmailGateModal />
      <ToastStack />
      {/* The floating bubble would sit on top of a Studio editor's own toolbar. */}
      {!location.pathname.startsWith('/studio/') && <ContactChat />}
      <InstallPrompt />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <UsageProvider>
        <EmailGateProvider>
          <PreviewProvider>
            <Shell />
          </PreviewProvider>
        </EmailGateProvider>
      </UsageProvider>
    </ToastProvider>
  )
}
