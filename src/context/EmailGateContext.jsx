import { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from './ToastContext.jsx'

const STORAGE_KEY = 'fileflowhq_email'

function readStoredEmail() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

function writeStoredEmail(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable (private mode, quota, etc). Non-fatal — the gate
    // just re-prompts next visit instead of persisting.
  }
}

/**
 * Gates every file download behind a one-time email prompt, remembered in
 * localStorage so returning visitors are never asked again on this device.
 * Tools call `gatedDownload(perform, filename, toolName)` instead of
 * `downloadBlob` directly, where `perform` is a zero-arg function that does
 * the actual download(s) (one blob, or several for a "download all" button)
 * and `toolName` is the tool's display name (e.g. "PDF to Word") so the
 * confirmation email can say which tool did the conversion. Captured at
 * call time rather than read from "current route" at submit time, since the
 * user could navigate away before submitting the email.
 * The first-ever call opens a modal; once the user submits a valid email,
 * it's saved to localStorage, `perform` runs, a confirmation is sent
 * (best-effort), and every gatedDownload call after that — this visit and
 * every future one on this device — runs immediately.
 */
const EmailGateContext = createContext(null)

export function EmailGateProvider({ children }) {
  const { showToast } = useToast()
  const [email, setEmail] = useState(readStoredEmail)
  const [pending, setPending] = useState(null) // { perform, filename, toolName } awaiting email submission

  const gatedDownload = useCallback(
    (perform, filename, toolName) => {
      if (email) {
        perform()
        showToast(`${filename} downloaded`)
        return
      }
      setPending({ perform, filename, toolName })
    },
    [email, showToast]
  )

  const submitEmail = useCallback(
    async (submittedEmail) => {
      setEmail(submittedEmail)
      writeStoredEmail(submittedEmail)
      if (pending) {
        pending.perform()
        showToast(`${pending.filename} downloaded`)
        fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: submittedEmail, fileName: pending.filename, toolName: pending.toolName }),
        }).catch(() => {
          // Confirmation email is best-effort; the download already succeeded.
        })
        setPending(null)
      }
    },
    [pending, showToast]
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
