import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { promptInstall, useCanInstall } from '../utils/installPrompt'

const DISMISS_KEY = 'installPromptDismissedAt'
const DISMISS_DAYS = 14
// Wait a little so the prompt doesn't greet someone before they've seen the app.
const SHOW_DELAY_MS = 12000

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/**
 * One-click "Add to Home Screen" card. Only appears where the browser supports
 * installing from a button (Chrome, Edge, Android); tapping Install opens the
 * native install dialog. Hidden for 14 days after dismissal. The header's
 * Install app button (InstallButton) stays available regardless.
 */
export default function InstallPrompt() {
  const canInstall = useCanInstall()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(recentlyDismissed)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Storage blocked (private mode) — it just shows again next visit.
    }
  }

  const install = async () => {
    const outcome = await promptInstall()
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <AnimatePresence>
      {canInstall && ready && !dismissed && (
        <motion.div
          role="dialog"
          aria-label="Install FileFlowHQ"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-3 top-3 z-40 rounded-card border border-border bg-panel p-4 shadow-card sm:left-auto sm:right-6 sm:top-6 sm:w-[360px]"
        >
          <div className="flex items-start gap-3">
            <img src="/pwa-192x192.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[0.95rem] font-semibold tracking-wide text-text">
                Install FileFlowHQ
              </p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-text-dim">
                Open it like an app, in one tap. It works offline too.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 text-text-dim transition-colors hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={dismiss}
              className="rounded-xl px-3 py-2 text-sm text-text-dim transition-colors hover:text-text"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Small header button that opens the native install dialog, when available. */
export function InstallButton() {
  const canInstall = useCanInstall()
  if (!canInstall) return null
  return (
    <button
      onClick={promptInstall}
      className="inline-flex items-center gap-1 underline transition-colors hover:text-signal"
    >
      <Download className="h-3 w-3" strokeWidth={2} />
      Install app
    </button>
  )
}
