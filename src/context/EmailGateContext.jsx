import { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from './ToastContext.jsx'

const STORAGE_KEY = 'fileflowhq_email'
const SKIP_KEY = 'fileflowhq_email_skipped_at'
const SKIP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

/** True if the user skipped the email prompt recently enough to not be asked again yet. */
function isSkipSnoozed() {
  try {
    const at = Number(localStorage.getItem(SKIP_KEY))
    return Boolean(at) && Date.now() - at < SKIP_SNOOZE_MS
  } catch {
    return false
  }
}

function writeSkipTime() {
  try {
    localStorage.setItem(SKIP_KEY, String(Date.now()))
  } catch {
    // Non-fatal — the gate just asks again next time.
  }
}

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

function sendConfirmation(email, fileName, toolName) {
  // Best-effort and fully isolated: the download has already happened, so
  // nothing here (network failure, Mailjet outage, a synchronous throw) may
  // ever surface to the user or affect the file they received.
  try {
    fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fileName, toolName }),
    }).catch(() => {})
  } catch {
    // ignore
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
 * it's saved to localStorage and every gatedDownload call after that — this
 * visit and every future one on this device — runs immediately with no
 * modal. A confirmation email is sent for every download, not just the
 * first, since that's the point of asking for the address.
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
        sendConfirmation(email, filename, toolName)
        return
      }
      if (isSkipSnoozed()) {
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
        sendConfirmation(submittedEmail, pending.filename, pending.toolName)
        setPending(null)
      }
    },
    [pending, showToast]
  )

  // Download without giving an email. No confirmation email is sent, and the
  // prompt is snoozed for a week so skipping doesn't mean being asked again on
  // every download.
  const skipGate = useCallback(() => {
    if (!pending) return
    writeSkipTime()
    pending.perform()
    showToast(`${pending.filename} downloaded`)
    setPending(null)
  }, [pending, showToast])

  const cancelGate = useCallback(() => setPending(null), [])

  return (
    <EmailGateContext.Provider value={{ gatedDownload, pending, submitEmail, skipGate, cancelGate }}>
      {children}
    </EmailGateContext.Provider>
  )
}

export function useEmailGate() {
  const ctx = useContext(EmailGateContext)
  if (!ctx) throw new Error('useEmailGate must be used within an EmailGateProvider')
  return ctx
}
