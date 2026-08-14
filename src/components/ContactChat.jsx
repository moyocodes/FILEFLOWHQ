import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Async "email live chat": a floating launcher that opens a drawer where a
 * visitor leaves an email + message, relayed to the admin via Mailjet
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
        onClick={() => setOpen(true)}
        aria-label="Contact admin"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-signal text-void shadow-card sm:bottom-6 sm:left-6"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-50 bg-void/60 backdrop-blur-md"
            />

            <motion.div
              key="drawer"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[55] flex w-full max-w-md flex-col overflow-hidden border-l border-border bg-panel shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="gate-blob-a absolute -left-24 -top-24 h-72 w-72 rounded-full bg-signal/25 blur-3xl" />
                <div className="gate-blob-b absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-signal/15 blur-3xl" />
              </div>

              <div className="relative flex flex-1 flex-col overflow-y-auto px-7 py-8 sm:px-9">
                <button
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-6 top-7 flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text sm:right-8"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>

                <div className="mt-auto mb-auto">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal text-void">
                    <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
                  </div>

                  {sent ? (
                    <>
                      <h2 className="font-display mb-2 text-2xl tracking-wide">Message sent</h2>
                      <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-dim">
                        Thanks — we'll get back to you at <strong className="text-text">{email}</strong> as soon as
                        we can.
                      </p>
                      <button
                        onClick={close}
                        className="w-full rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
                      >
                        Done
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display mb-2 text-2xl tracking-wide">Message the admin</h2>
                      <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-dim">
                        Not live chat — leave your email and a message, and we'll reply directly to your inbox.
                      </p>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                          type="email"
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-border bg-void px-4 py-3 text-sm text-text outline-none transition-colors focus:border-signal"
                        />
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="How can we help?"
                          rows={5}
                          className="w-full resize-none rounded-xl border border-border bg-void px-4 py-3 text-sm text-text outline-none transition-colors focus:border-signal"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <button
                          type="submit"
                          disabled={sending}
                          className="w-full rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {sending ? 'Sending…' : 'Send message'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
