import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { tools } from '../toolsConfig.js'
import ThemeToggle from './ThemeToggle.jsx'

/**
 * Left rail: brand, labeled tool list with an animated active-state
 * accent bar (framer-motion layoutId shared-element transition), and a
 * footer caption + theme toggle. ~208px wide on desktop; collapses to a
 * slide-over on small screens (see MobileMenuButton).
 */
export default function Rail({ isOpen, onClose }) {
  const navigate = useNavigate()

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
          'fixed inset-y-0 left-0 z-40 flex w-[208px] flex-shrink-0 flex-col overflow-hidden border-r border-border bg-panel px-3 py-[1.1rem] transition-transform duration-200',
          'md:sticky md:top-0 md:h-[100dvh] md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        ].join(' ')}
      >
        <div className="mb-7 flex items-center gap-2.5 px-1">
          <button
            onClick={goHome}
            className="flex flex-1 items-center gap-2.5 rounded py-0 text-left"
          >
            <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[3px] bg-signal font-mono text-[0.78rem] font-bold text-void">
              C
            </span>
            <span className="font-display text-[0.92rem] font-semibold tracking-wide text-text">
              Convertly
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

        <div className="mb-2 px-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-text-dim">
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
                className={({ isActive }) =>
                  [
                    'relative flex flex-shrink-0 items-center gap-[0.65rem] rounded px-[0.6rem] py-[0.55rem] text-left transition-colors',
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
                    <span className="flex-1 truncate text-[0.78rem] font-medium">{tool.name}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-3 flex flex-shrink-0 items-center justify-between px-1">
          <span className="font-mono text-[0.62rem] leading-[1.4] text-text-dim">
            100% local
            <br />
            no uploads
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
