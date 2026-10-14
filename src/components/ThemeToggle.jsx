import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

// New key: the old 'theme' key was written on every page load, so it holds
// accidental 'light' values from before dark became the default.
export const THEME_KEY = 'ffhq-theme'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Saved only when the visitor actually taps the toggle (never on load), so
  // the dark default holds until someone chooses light.
  const toggle = () => {
    const next = !isDark
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
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-panel-raised text-text-dim transition-colors hover:text-signal"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Moon className="h-3.5 w-3.5" strokeWidth={2.25} />}
    </button>
  )
}
