import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { track } from '@vercel/analytics'
import { isNative, isExtension } from '../utils/platform'

const DISMISS_KEY = 'installPromptDismissedAt'
const DISMISS_DAYS = 14
// Wait a little so the prompt doesn't greet someone before they've seen the app.
const SHOW_DELAY_MS = 12000

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

// iOS Safari has no beforeinstallprompt event, so we show manual steps instead.
// iPadOS reports itself as Mac, hence the touch check.
function isIosSafari() {
  const ua = window.navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return ios && !otherBrowser
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/**
 * "Add to Home Screen" prompt for the web build. Chrome/Edge/Android get a
 * one-tap Install button (via the deferred beforeinstallprompt event); iOS
 * Safari gets Share → Add to Home Screen instructions. Hidden in the native
 * apps, the extension, when already installed, and for 14 days after dismissal.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [mode, setMode] = useState(null) // 'install' | 'ios' | null
  const [visible, setVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (isNative || isExtension || isStandalone() || recentlyDismissed()) return

    let timer
    const showLater = (m) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setMode(m)
        setVisible(true)
      }, SHOW_DELAY_MS)
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      showLater('install')
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
      track('pwa_installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    if (isIosSafari()) showLater('ios')

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Storage blocked (private mode) — it just shows again next visit.
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    track('pwa_install_prompt', { outcome })
    setDeferredPrompt(null)
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  return (
    <AnimatePresence>
      {visible && mode && (
        <motion.div
          role="dialog"
          aria-label="Add FileFlowHQ to your home screen"
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
                Add FileFlowHQ to your home screen
              </p>
              {mode === 'install' ? (
                <p className="mt-1 text-[0.82rem] leading-relaxed text-text-dim">
                  Open it like an app, in one tap. It works offline too.
                </p>
              ) : (
                <p className="mt-1 text-[0.82rem] leading-relaxed text-text-dim">
                  Tap <Share className="inline h-3.5 w-3.5 align-[-2px] text-signal" strokeWidth={2} />{' '}
                  <span className="font-medium text-text">Share</span>, then{' '}
                  <SquarePlus className="inline h-3.5 w-3.5 align-[-2px] text-signal" strokeWidth={2} />{' '}
                  <span className="font-medium text-text">Add to Home Screen</span>.
                </p>
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

          {mode === 'install' && (
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
