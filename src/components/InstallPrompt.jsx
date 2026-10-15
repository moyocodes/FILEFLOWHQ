import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { promptInstall, useCanInstall } from '../utils/installPrompt'
import { isIOS, isNative, isExtension } from '../utils/platform'

// Dismissal lasts for this browser session only, so the prompt comes back
// every time the browser is reopened.
const DISMISS_KEY = 'installPromptDismissed'
// Wait a little so the prompt doesn't greet someone before they've seen the app.
const SHOW_DELAY_MS = 12000

function dismissedThisSession() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

/** iPhone/iPad Safari can't install from a button, so it gets Share → Add to Home Screen steps. */
const showIOSSteps = () => isIOS && !isNative && !isExtension && !isStandalone()

/**
 * One-click "Add to Home Screen" card. Only appears where the browser supports
 * installing from a button (Chrome, Edge, Android); tapping Install opens the
 * native install dialog. On iPhone/iPad it shows the Share → Add to Home
 * Screen steps instead. Dismissing hides it until the next browser session.
 * The header's Install app button (InstallButton) stays available regardless.
 */
export default function InstallPrompt() {
  const canInstall = useCanInstall()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(dismissedThisSession)
  const ios = showIOSSteps()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked (private mode) — it just shows again on the next page load.
    }
  }

  const install = async () => {
    const outcome = await promptInstall()
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <AnimatePresence>
      {(canInstall || ios) && ready && !dismissed && (
        <motion.div
          role="dialog"
          aria-label="Install FileFlowHQ"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-3 bottom-3 z-40 rounded-card bg-panel p-4 shadow-lift sm:bottom-auto sm:left-auto sm:right-6 sm:top-20 sm:w-[360px]"
        >
          <div className="flex items-start gap-3">
            <img src="/pwa-192x192.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-medium text-text">
                Install FileFlowHQ
              </p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-text-dim">
                {ios ? 'Add it to your Home Screen to open it like an app. It works offline too.' : 'Open it like an app, in one tap. It works offline too.'}
              </p>
              {ios && (
                <ol className="mt-2.5 space-y-1.5 text-[0.82rem] text-text">
                  <li className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-signal-dim text-[0.7rem] font-medium text-signal">1</span>
                    Tap <Share className="h-4 w-4 text-signal" aria-label="Share" /> Share in Safari
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-signal-dim text-[0.7rem] font-medium text-signal">2</span>
                    Choose <SquarePlus className="h-4 w-4 text-signal" aria-hidden="true" /> Add to Home Screen
                  </li>
                </ol>
              )}
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 text-text-dim transition-colors hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {ios ? (
            <div className="mt-3 flex justify-end">
              <button onClick={dismiss} className="rounded-full bg-signal px-4 py-2 text-sm font-medium text-void">
                Got it
              </button>
            </div>
          ) : (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={dismiss}
              className="rounded-full px-3 py-2 text-sm text-text-dim transition-colors hover:text-text"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-sm font-medium text-void transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Install
            </button>
          </div>
          )}
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
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.88rem] font-medium text-text transition-colors hover:bg-panel-raised"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={2} />
      Install app
    </button>
  )
}
