import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark((d) => !d)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded border border-border bg-panel-raised text-text-dim transition-colors hover:text-signal"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Moon className="h-3.5 w-3.5" strokeWidth={2.25} />}
    </button>
  )
}
