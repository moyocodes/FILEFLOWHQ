import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { tools, categories } from '../toolsConfig.js'
import ThemeToggle from './ThemeToggle.jsx'
import { InstallButton } from './InstallPrompt.jsx'
import ExtensionButton from './ExtensionButton.jsx'

/** Full wordmark; the light-mode file has dark lettering, the original has white. */
export function Wordmark({ className = 'h-8' }) {
  return (
    <>
      <img src="/logofull-light.svg" alt="FileFlowHQ" width="248" height="63" className={`${className} w-auto dark:hidden`} />
      <img src="/logofull.svg" alt="FileFlowHQ" width="248" height="63" className={`${className} hidden w-auto dark:block`} />
    </>
  )
}

function ToolLinks({ onNavigate, columns = true }) {
  return (
    <div className={columns ? 'grid gap-8 md:grid-cols-3' : 'space-y-6'}>
      {categories.map((cat) => (
        <div key={cat.id}>
          <div className="mb-2 px-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-text-dim">{cat.label}</div>
          <ul className="space-y-0.5">
            {tools
              .filter((t) => t.category === cat.id)
              .map((t) => {
                const Icon = t.icon
                return (
                  <li key={t.id}>
                    <NavLink
                      to={t.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
                          isActive ? 'bg-signal-dim text-text' : 'hover:bg-panel-raised'
                        ].join(' ')
                      }
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-signal-dim text-signal">
                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.85rem] font-medium text-text">{t.name}</span>
                        <span className="block truncate text-[0.72rem] text-text-dim">{t.tagline}</span>
                      </span>
                    </NavLink>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/**
 * Sticky top navigation: wordmark, secondary links, and a "Tools" button that
 * opens a right-hand side drawer listing every tool by category (the same
 * drawer on desktop and mobile). Borderless — it lifts off the page with a
 * soft shadow once you scroll.
 */
export default function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const closeRef = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close on navigation.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // While open: lock page scroll, Escape closes, focus the close button.
  useEffect(() => {
    if (!drawerOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const link =
    'rounded-full px-3.5 py-2 text-[0.85rem] font-medium text-text-dim transition-colors hover:bg-panel-raised hover:text-text'

  return (
    <header
      className={[
        'sticky top-0 z-30 transition-shadow duration-200',
        'bg-[color-mix(in_srgb,var(--void)_85%,transparent)] backdrop-blur-lg',
        scrolled ? 'shadow-[0_8px_30px_-12px_rgba(16,24,40,0.18)]' : ''
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="FileFlowHQ home" className="flex items-center">
          <Wordmark className="h-8" />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          <NavLink to="/contact" className={`${link} hidden md:inline-flex`}>
            Contact
          </NavLink>
          <NavLink to="/privacy" className={`${link} hidden md:inline-flex`}>
            Privacy
          </NavLink>
          <span className="hidden md:inline-flex">
            <ExtensionButton />
          </span>
          <span className="hidden md:inline-flex">
            <InstallButton />
          </span>
          <div className="mx-1">
            <ThemeToggle />
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="tools-drawer"
            className="inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2.5 text-[0.85rem] font-semibold text-white shadow-[0_10px_24px_-10px_var(--signal)] transition-transform hover:-translate-y-0.5 dark:text-void sm:px-5"
          >
            <Menu className="h-4 w-4" strokeWidth={2.25} />
            Tools
          </button>
        </nav>
      </div>

      {/* Portalled to <body>: the header's backdrop-blur makes it the containing block for
          position:fixed children, which would trap the drawer inside the 64px bar. */}
      {createPortal(
        <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              id="tools-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="All tools"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-void shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)]"
            >
              <div className="flex h-16 flex-shrink-0 items-center justify-between px-5">
                <span className="text-[1rem] font-semibold">All tools</span>
                <button
                  ref={closeRef}
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close tools"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-raised text-text"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-6">
                <ToolLinks columns={false} onNavigate={() => setDrawerOpen(false)} />
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-2 px-5 pb-6 pt-3 md:hidden">
                <Link to="/contact" className="rounded-full bg-panel-raised px-4 py-2 text-sm font-medium">
                  Contact
                </Link>
                <Link to="/privacy" className="rounded-full bg-panel-raised px-4 py-2 text-sm font-medium">
                  Privacy
                </Link>
                <ExtensionButton />
                <InstallButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>,
        document.body
      )}
    </header>
  )
}
