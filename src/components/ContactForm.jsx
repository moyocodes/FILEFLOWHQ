import { useState } from 'react'
import { apiUrl } from '../utils/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const CONTACT_EMAIL = 'moyosorejames@gmail.com'

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
 * The contact form (template chips, email, message, send + success state),
 * shared by the floating drawer and the /contact page. `onDone` runs when the
 * visitor dismisses the success message.
 */
export default function ContactForm({ onDone }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [template, setTemplate] = useState(null)

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
    {sent ? (
      <>
        <p className="mb-4 text-sm leading-relaxed text-text-dim">
          Thanks — we'll get back to you at <strong className="text-text">{email}</strong> as soon as we
          can.
        </p>
        <button
          onClick={onDone}
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
    </>
  )
}
