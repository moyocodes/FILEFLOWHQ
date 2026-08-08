import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { track } from '@vercel/analytics'
import Rail, { MobileMenuButton } from './components/Rail.jsx'
import Home from './pages/Home.jsx'
import ToolPage from './pages/ToolPage.jsx'
import { tools } from './toolsConfig.js'
import { SettingsPanelProvider, useSettingsPanel } from './context/SettingsPanelContext.jsx'
import { EmailGateProvider } from './context/EmailGateContext.jsx'
import EmailGateModal from './components/EmailGateModal.jsx'

function activeToolFromPath(pathname) {
  return tools.find((t) => t.path === pathname) || null
}

function WsHeader({ activeTool, onOpenMenu }) {
  const navigate = useNavigate()
  const coords = activeTool ? `FILEFLOWHQ / ${activeTool.id.toUpperCase().replace(/-/g, '_')}` : 'FILEFLOWHQ / HOME'

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-[0.85rem] sm:px-9">
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={onOpenMenu} />
        <div className="flex items-center gap-2 font-mono text-[0.7rem] text-text-dim">
          <button onClick={() => navigate('/')} className="transition-colors hover:text-signal">
            FileFlowHQ
          </button>
          {activeTool && (
            <>
              <span className="text-border-strong">/</span>
              <span className="text-text">{activeTool.name}</span>
            </>
          )}
        </div>
      </div>
      <span className="hidden font-mono text-[0.65rem] text-text-dim sm:inline">{coords}</span>
    </div>
  )
}

function SettingsPane({ activeTool }) {
  const { settingsContent } = useSettingsPanel()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {activeTool && (
        <motion.aside
          key="settings"
          initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-20 flex max-h-[70vh] w-full flex-col overflow-hidden border-t border-border bg-panel md:static md:inset-auto md:z-auto md:h-[100dvh] md:max-h-none md:w-[280px] md:flex-shrink-0 md:border-l md:border-t-0"
        >
          <div className="flex-shrink-0 border-b border-border px-5 py-[0.85rem] font-mono text-[0.66rem] uppercase tracking-[0.1em] text-text-dim">
            {activeTool.name} settings
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">{settingsContent}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const activeTool = activeToolFromPath(location.pathname)

  useEffect(() => {
    track('pageview', { path: location.pathname })
  }, [location.pathname])

  return (
    <div className="flex w-full flex-col md:h-[100dvh] md:flex-row md:overflow-hidden">
      <Rail isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col md:h-[100dvh] md:overflow-hidden">
        <WsHeader activeTool={activeTool} onOpenMenu={() => setMenuOpen(true)} />

        <div className="min-h-0 flex-1 md:overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            {tools.map((tool) => (
              <Route key={tool.id} path={tool.path} element={<ToolPage key={tool.id} tool={tool} />} />
            ))}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </div>

      <SettingsPane activeTool={activeTool} />
      <EmailGateModal />
    </div>
  )
}

export default function App() {
  return (
    <SettingsPanelProvider>
      <EmailGateProvider>
        <Shell />
      </EmailGateProvider>
    </SettingsPanelProvider>
  )
}
