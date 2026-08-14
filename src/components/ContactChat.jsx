import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Async "email live chat": a floating launcher that opens a small chat-widget
 * panel (anchored to the launcher, not a full-screen drawer) where a visitor
 * leaves an email + message, relayed to the admin via Mailjet
 * (api/contact-message.js). Not real-time chat — no backend to poll, no
 * websocket — just a fast way to reach the admin without leaving the app.
 */
export default function ContactChat() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const close = () => {
    setOpen(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!message.trim()) {
      setError('Write a message first.')
      return
    }

    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/contact-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      })
      if (!response.ok) {
        const { error: apiError } = await response.json().catch(() => ({}))
        throw new Error(apiError || 'Could not send your message.')
      }
      setSent(true)
      setMessage('')
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close contact panel' : 'Contact admin'}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-signal text-void shadow-card sm:bottom-6 sm:left-6"
      >
        {open ? <X className="h-5 w-5" strokeWidth={2.25} /> : <MessageCircle className="h-5 w-5" strokeWidth={2.25} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-[4.75rem] left-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl sm:bottom-24 sm:left-6"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="gate-blob-a absolute -left-16 -top-16 h-48 w-48 rounded-full bg-signal/20 blur-3xl" />
            </div>

            <div className="relative flex items-center gap-2.5 border-b border-border px-5 py-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-signal text-void">
                <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold tracking-wide">Message the admin</p>
                <p className="text-xs text-text-dim">Not live chat — we reply by email</p>
              </div>
            </div>

            <div className="relative px-5 py-5">
              {sent ? (
                <>
                  <p className="mb-4 text-sm leading-relaxed text-text-dim">
                    Thanks — we'll get back to you at <strong className="text-text">{email}</strong> as soon as we
                    can.
                  </p>
                  <button
                    onClick={close}
                    className="w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-void transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border bg-void px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-signal"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-void px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-signal"
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
