import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, PanelLeftClose, PanelLeftOpen, Home } from 'lucide-react'
import { tools } from '../toolsConfig.js'
import ThemeToggle from './ThemeToggle.jsx'

const COLLAPSE_KEY = 'fileflowhq-rail-collapsed'

/**
 * Left rail: brand, labeled tool list with an animated active-state
 * accent bar (framer-motion layoutId shared-element transition), and a
 * footer caption + theme toggle. ~208px wide on desktop; collapses to a
 * slide-over on small screens (see MobileMenuButton), or to a narrow
 * icon-only toolbar on desktop via the collapse toggle (persisted in
 * localStorage so the choice survives a reload).
 */
export default function Rail({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // Private browsing / storage disabled — collapse state just won't persist.
    }
  }, [collapsed])

  const goHome = () => {
    onClose?.()
    navigate('/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-shrink-0 flex-col overflow-visible border-r border-border bg-panel px-3 py-[1.1rem] transition-[transform,width] duration-200',
          collapsed ? 'md:w-[60px]' : 'md:w-[208px]',
          'w-[208px]',
          'md:sticky md:top-0 md:h-[100dvh] md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        ].join(' ')}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-[1.35rem] z-10 hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-panel text-text-dim shadow-card transition-colors hover:border-signal hover:text-signal md:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </button>

        <div className={['mb-7 flex items-center gap-2.5 px-1', collapsed ? 'md:justify-center' : ''].join(' ')}>
          <button
            onClick={goHome}
            className="flex flex-1 items-center gap-2.5 rounded py-0 text-left md:flex-initial"
            aria-label="FileFlowHQ home"
          >
            <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[3px] bg-signal font-mono text-[0.78rem] font-bold text-void">
              F
            </span>
            <span
              className={['font-display text-[0.92rem] font-semibold tracking-wide text-text', collapsed ? 'md:hidden' : ''].join(' ')}
            >
              FileFlowHQ
            </span>
          </button>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto text-text-dim md:hidden"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        <NavLink
          to="/"
          end
          onClick={onClose}
          title={collapsed ? 'Home' : undefined}
          className={({ isActive }) =>
            [
              'relative mb-3 flex flex-shrink-0 items-center gap-[0.65rem] rounded px-[0.6rem] py-[0.55rem] text-left transition-colors',
              collapsed ? 'md:justify-center' : '',
              isActive ? 'bg-signal-dim text-signal' : 'text-text-dim hover:bg-panel-raised hover:text-text'
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="rail-active-bar"
                  className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-[2px] bg-signal"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Home className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
              <span className={['flex-1 truncate text-[0.78rem] font-medium', collapsed ? 'md:hidden' : ''].join(' ')}>
                Home
              </span>
            </>
          )}
        </NavLink>

        <div
          className={[
            'mb-2 px-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-text-dim',
            collapsed ? 'md:hidden' : ''
          ].join(' ')}
        >
          Tools
        </div>

        <nav className="scrollbar-thin flex flex-1 flex-col gap-[0.15rem] overflow-y-auto">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <NavLink
                key={tool.id}
                to={tool.path}
                onClick={onClose}
                title={collapsed ? tool.name : undefined}
                className={({ isActive }) =>
                  [
                    'relative flex flex-shrink-0 items-center gap-[0.65rem] rounded px-[0.6rem] py-[0.55rem] text-left transition-colors',
                    collapsed ? 'md:justify-center' : '',
                    isActive
                      ? 'bg-signal-dim text-signal'
                      : 'text-text-dim hover:bg-panel-raised hover:text-text'
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="rail-active-bar"
                        className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-[2px] bg-signal"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                    <span className={['flex-1 truncate text-[0.78rem] font-medium', collapsed ? 'md:hidden' : ''].join(' ')}>
                      {tool.name}
                    </span>
                    {tool.comingSoon && (
                      <span
                        className={[
                          'flex-shrink-0 font-mono text-[0.55rem] uppercase tracking-wide text-text-dim',
                          collapsed ? 'md:hidden' : ''
                        ].join(' ')}
                      >
                        Soon
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div
          className={[
            'mt-3 flex flex-shrink-0 items-center justify-between px-1',
            collapsed ? 'md:flex-col md:gap-2' : ''
          ].join(' ')}
        >
          <span className={['font-mono text-[0.62rem] leading-[1.4] text-text-dim', collapsed ? 'md:hidden' : ''].join(' ')}>
            mostly local
            <br />
            free &amp; private
          </span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-dim md:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" strokeWidth={2.25} />
    </button>
  )
}
