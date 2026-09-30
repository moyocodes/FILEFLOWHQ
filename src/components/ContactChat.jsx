import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { apiUrl } from '../utils/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_EMAIL = 'moyosorejames@gmail.com'

// One-tap starting points. Picking one fills the message box with a short
// prompt to complete; the visitor can edit or replace it freely.
const TEMPLATES = [
  {
    id: 'bug',
    label: 'Report a bug',
    text: 'Bug report\n\nTool: \nWhat I did: \nWhat I expected: \nWhat happened instead: \nBrowser / device: ',
  },
  {
    id: 'tool-not-working',
    label: 'Tool not working',
    text: "A tool isn't working\n\nTool: \nFile type and size: \nError message (if any): ",
  },
  { id: 'feature', label: 'Request a feature', text: 'Feature request\n\nWhat I want to do: \nWhy it would help: ' },
  { id: 'privacy', label: 'Privacy question', text: 'Privacy question\n\nMy question: ' },
  { id: 'feedback', label: 'Share feedback', text: 'Feedback\n\n' },
  {
    id: 'business',
    label: 'Business / partnership',
    text: 'Business enquiry\n\nCompany / project: \nWhat I have in mind: ',
  },
]

/**
 * Async "email live chat": a floating launcher that opens a side drawer where
 * a visitor picks an optional message template, then leaves an email +
 * message, relayed to the admin via Mailjet
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
  const [template, setTemplate] = useState(null)
  const prefersReducedMotion = useReducedMotion()

  const close = () => {
    setOpen(false)
    setError('')
    if (sent) {
      setSent(false)
      setTemplate(null)
    }
  }

  const pickTemplate = (t) => {
    setTemplate(t.id)
    setMessage(t.text)
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
      const response = await fetch(apiUrl('/api/contact-message'), {
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
      setTemplate(null)
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
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-void/60 backdrop-blur-sm"
            />

            <motion.div
              key="drawer"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[45] flex w-full max-w-md flex-col overflow-hidden border-l border-border bg-panel shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="gate-blob-a absolute -left-16 -top-16 h-48 w-48 rounded-full bg-signal/20 blur-3xl" />
              </div>

              <div className="relative flex items-center gap-2.5 border-b border-border px-6 py-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-signal text-void">
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold tracking-wide">Contact FileFlowHQ</p>
                  <p className="text-xs text-text-dim">Not live chat — we reply by email</p>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="relative flex-1 overflow-y-auto px-6 py-6">
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
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-text-dim">
                        Start from a template
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => pickTemplate(t)}
                            aria-pressed={template === t.id}
                            className={[
                              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                              template === t.id
                                ? 'border-signal bg-signal-dim text-signal'
                                : 'border-border text-text-dim hover:border-signal hover:text-signal',
                            ].join(' ')}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
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
                        rows={9}
                        className="w-full resize-none rounded-xl border border-border bg-void px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-signal"
                      />
                    </div>
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

                <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-dim">
                  Prefer email? Write to{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-signal underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
