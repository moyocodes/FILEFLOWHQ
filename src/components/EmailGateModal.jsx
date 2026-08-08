import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useEmailGate } from '../context/EmailGateContext.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailGateModal() {
  const { pending, submitEmail, cancelGate } = useEmailGate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  if (!pending) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    submitEmail(value)
    setValue('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-panel p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-signal" strokeWidth={2} />
          <h2 className="font-display text-base tracking-wide">One more step</h2>
        </div>
        <p className="mb-4 text-sm text-text-dim">
          Enter your email to download. We'll send a confirmation — this is asked once per visit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border border-border bg-void px-3 py-2 text-sm text-text outline-none focus:border-signal"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelGate}
              className="flex-1 rounded border border-border px-4 py-2 text-sm font-medium text-text-dim transition-colors hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-signal px-4 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90"
            >
              Download
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
