import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

// New key: the old 'theme' key was written on every page load, so it holds
// accidental 'light' values from before dark became the default.
export const THEME_KEY = 'ffhq-theme'

export default function ThemeToggle({ compact = false }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  // The theme can also change elsewhere (the system's mode, main.jsx, or another toggle).
  useEffect(() => {
    const html = document.documentElement
    const sync = new MutationObserver(() => setIsDark(html.classList.contains('dark')))
    sync.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => sync.disconnect()
  }, [])

  // Saved only when the visitor actually taps the toggle (never on load), so
  // the system's mode holds until someone chooses.
  const toggle = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    setIsDark(next)
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {
      // storage blocked: the choice lasts for this page only
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex ${compact ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 items-center justify-center rounded-full bg-panel-raised text-text-dim transition-colors hover:text-signal`}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Moon className="h-3.5 w-3.5" strokeWidth={2.25} />}
    </button>
  )
}
