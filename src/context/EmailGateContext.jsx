import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Gates every file download behind a one-time-per-session email prompt.
 * Tools call `gatedDownload(perform, filename)` instead of `downloadBlob`
 * directly, where `perform` is a zero-arg function that does the actual
 * download(s) (one blob, or several for a "download all" button).
 * The first call of the session opens a modal; once the user submits a
 * valid email, `perform` runs, a confirmation is sent (best-effort), and
 * every gatedDownload call for the rest of the session runs immediately.
 */
const EmailGateContext = createContext(null)

export function EmailGateProvider({ children }) {
  const [email, setEmail] = useState(null)
  const [pending, setPending] = useState(null) // { perform, filename } awaiting email submission

  const gatedDownload = useCallback(
    (perform, filename) => {
      if (email) {
        perform()
        return
      }
      setPending({ perform, filename })
    },
    [email]
  )

  const submitEmail = useCallback(
    async (submittedEmail) => {
      setEmail(submittedEmail)
      if (pending) {
        pending.perform()
        fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: submittedEmail, fileName: pending.filename }),
        }).catch(() => {
          // Confirmation email is best-effort; the download already succeeded.
        })
        setPending(null)
      }
    },
    [pending]
  )

  const cancelGate = useCallback(() => setPending(null), [])

  return (
    <EmailGateContext.Provider value={{ gatedDownload, pending, submitEmail, cancelGate }}>
      {children}
    </EmailGateContext.Provider>
  )
}

export function useEmailGate() {
  const ctx = useContext(EmailGateContext)
  if (!ctx) throw new Error('useEmailGate must be used within an EmailGateProvider')
  return ctx
}
