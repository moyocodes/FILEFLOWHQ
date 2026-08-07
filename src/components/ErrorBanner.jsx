import { AlertTriangle, X } from 'lucide-react'

/** Accepts a single message string or an array of messages. */
export default function ErrorBanner({ messages, onDismiss }) {
  const list = Array.isArray(messages) ? messages : [messages]
  const visible = list.filter(Boolean)
  if (visible.length === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.25} />
      <div className="flex-1 space-y-1">
        {visible.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss error" className="text-red-500 hover:text-red-700">
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}
