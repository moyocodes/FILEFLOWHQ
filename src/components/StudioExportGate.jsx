import { useCallback, useEffect, useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import { useUsage } from '../context/UsageContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { apiUrl } from '../utils/api'
import { saveBlob } from '../utils/platform.js'

const EMAIL_KEY = 'fileflowhq_email'
const PAYSTACK_INLINE = 'https://js.paystack.co/v2/inline.js'

const MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  txt: 'text/plain'
}

function readEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

let paystackScript
function loadPaystack() {
  paystackScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = PAYSTACK_INLINE
    s.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack did not load')))
    s.onerror = () => {
      paystackScript = null
      reject(new Error('Paystack did not load'))
    }
    document.head.appendChild(s)
  })
  return paystackScript
}

/** Diagonal "FileFlowHQ" tiles, shown over the editor until the visitor has paid credits. */
const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="160"><text x="20" y="100" transform="rotate(-24 130 80)" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" fill="#0e8f5c" fill-opacity="0.16">FileFlowHQ</text></svg>'
)}")`

/**
 * Paid exports for a rebranded Studio editor. The editor (studio/patches/*.patch) hands every
 * save, export and print to this page as an `ffhq:export` message instead of downloading it.
 * Each one spends one *paid* use from the site-wide Paystack balance (api/usage.js,
 * `paid: true`); with none left, the visitor pays in a Paystack popup (the page, and the open
 * document, stay put) and the file is released straight after.
 */
export default function StudioExportGate({ iframeRef, app }) {
  const { paidRemaining, pricing, requestUse, verifyPayment } = useUsage()
  const { showToast } = useToast()
  const [pending, setPending] = useState(null) // { name, bytes } waiting for payment
  const [email, setEmail] = useState(readEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const deliver = useCallback(async ({ name, bytes }) => {
    const ext = name.split('.').pop().toLowerCase()
    await saveBlob(new Blob([bytes], { type: MIME[ext] || 'application/octet-stream' }), name)
    showToast(`${name} saved`)
  }, [showToast])

  const exportFile = useCallback(
    async (file) => {
      if (await requestUse(`studio:${app.id}:${file.name}`, { paid: true })) return deliver(file)
      setError('')
      setPending(file)
    },
    [app.id, deliver, requestUse]
  )

  // Files come only from our own editor frame (same origin, that exact window).
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      const { type, name, bytes } = event.data || {}
      if (type !== 'ffhq:export' || typeof name !== 'string' || !(bytes instanceof ArrayBuffer)) return
      exportFile({ name, bytes })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [exportFile, iframeRef])

  const pay = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      try {
        localStorage.setItem(EMAIL_KEY, email)
      } catch {
        // storage unavailable: they'll type it again next time
      }
      const res = await fetch(apiUrl('/api/pay-init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.accessCode) throw new Error(data.error || 'Could not start the payment.')
      const PaystackPop = await loadPaystack()
      new PaystackPop().resumeTransaction(data.accessCode, {
        onSuccess: async () => {
          const credited = await verifyPayment(data.reference).catch(() => false)
          if (!credited) {
            setBusy(false)
            setError('Payment received but not confirmed yet. Contact us with reference ' + data.reference)
            return
          }
          const file = pending
          setPending(null)
          setBusy(false)
          if (file && (await requestUse(`studio:${app.id}:${file.name}`, { paid: true }))) deliver(file)
        },
        onCancel: () => setBusy(false),
        onError: (err) => {
          setBusy(false)
          setError(err?.message || 'Payment failed. Please try again.')
        }
      })
    } catch (err) {
      setBusy(false)
      setError(err.message)
    }
  }

  const price = `₦${pricing.priceNaira.toLocaleString()}`
  const showWatermark = paidRemaining !== null && paidRemaining < 1

  return (
    <>
      {showWatermark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundImage: WATERMARK, backgroundRepeat: 'repeat' }}
        />
      )}

      {pending && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-void/70 p-4 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={pay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-pay-title"
            className="relative w-full max-w-sm rounded-card bg-panel p-5 shadow-lift"
          >
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="Close"
              className="absolute right-3 top-3 text-text-dim transition-colors hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-dim text-signal">
              <Lock className="h-5 w-5" />
            </span>
            <h2 id="studio-pay-title" className="text-[1.05rem] font-semibold">
              Save “{pending.name}”
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-text-dim">
              Editing in {app.name} is free. Saving, exporting and printing use credits:{' '}
              <strong className="text-text">
                {pricing.packUses} for {price}
              </strong>
              , shared with every FileFlowHQ tool. Your document stays open while you pay.
            </p>
            <label className="mt-4 block text-[0.75rem] font-medium text-text-dim">Email for your receipt</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl bg-panel-raised px-3 py-2.5 text-sm"
            />
            {error && <p className="mt-2 text-[0.8rem] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70 dark:text-void"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Waiting for Paystack…' : `Pay ${price} and save`}
            </button>
            <p className="mt-2 text-center text-[0.7rem] text-text-dim">Secure checkout by Paystack</p>
          </form>
        </div>
      )}
    </>
  )
}
