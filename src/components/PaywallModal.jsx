import { useState } from 'react'
import { X } from 'lucide-react'
import { useUsage } from '../context/UsageContext.jsx'
import { apiUrl } from '../utils/api'

const EMAIL_KEY = 'fileflowhq_email'

function storedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

/** Shown when the free uses are spent. Redirects to Paystack's hosted checkout. */
export default function PaywallModal() {
  const { paywallOpen, closePaywall, pricing } = useUsage()
  const [email, setEmail] = useState(storedEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!paywallOpen) return null

  const pay = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/pay-init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.authorizationUrl) throw new Error(data.error || 'Could not start the payment.')
      window.location.href = data.authorizationUrl
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const price = `₦${pricing.priceNaira.toLocaleString()}`

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-void/70 p-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={pay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative w-full max-w-sm rounded-card border border-border bg-panel p-5 shadow-2xl"
      >
        <button
          type="button"
          onClick={closePaywall}
          aria-label="Close"
          className="absolute right-3 top-3 text-text-dim transition-colors hover:text-text"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <h2 id="paywall-title" className="font-display text-[1.05rem] font-semibold tracking-wide">
          You've used your {pricing.freeUses} free conversions
        </h2>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-text-dim">
          FileFlowHQ is free to try. After {pricing.freeUses} uses across any tool, you can get{' '}
          <strong className="text-text">{pricing.packUses} more uses for {price}</strong>. You're charged per pack,
          never a subscription.
        </p>
        <label className="mt-4 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Email for your receipt
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded border border-border bg-transparent px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-[0.8rem] text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Opening Paystack…' : `Pay ${price} for ${pricing.packUses} more uses`}
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-text-dim">Secure checkout by Paystack</p>
      </form>
    </div>
  )
}
