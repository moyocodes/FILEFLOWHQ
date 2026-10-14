import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { track } from '@vercel/analytics'
import TopNav from './components/TopNav.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import Home from './pages/Home.jsx'
import ToolPage from './pages/ToolPage.jsx'
import Privacy from './pages/Privacy.jsx'
import Contact from './pages/Contact.jsx'
import { tools } from './toolsConfig.js'
import { EmailGateProvider } from './context/EmailGateContext.jsx'
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
      <TopNav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          {tools.map((tool) => (
            <Route key={tool.id} path={tool.path} element={<ToolPage key={tool.id} tool={tool} />} />
          ))}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/stats" element={<StatsDashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <SiteFooter />

      <PreviewModal />
      <EmailGateModal />
      <ToastStack />
      <ContactChat />
      <InstallPrompt />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <EmailGateProvider>
        <PreviewProvider>
          <Shell />
        </PreviewProvider>
      </EmailGateProvider>
    </ToastProvider>
  )
}
