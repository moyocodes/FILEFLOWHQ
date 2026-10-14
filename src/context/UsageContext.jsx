import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from './ToastContext.jsx'
import { apiUrl, ownerHeaders, captureOwnerKey } from '../utils/api'

const REPEAT_WINDOW_MS = 10 * 60 * 1000

async function post(path, body) {
  return fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
    body: JSON.stringify(body || {}),
  })
}

/**
 * Tracks the free/paid allowance. The count lives on the server, keyed by the
 * caller's IP (not the browser), so a new browser or cleared storage doesn't
 * reset it. `requestUse` is called once per download; on a 402 it opens the
 * paywall instead. Every failure path fails OPEN — if our API is down, people
 * can still download.
 */
const UsageContext = createContext(null)

export function UsageProvider({ children }) {
  const { showToast } = useToast()
  const [remaining, setRemaining] = useState(null) // null = unknown / unlimited
  const [paidRemaining, setPaidRemaining] = useState(null) // purchased uses left (Studio exports)
  const [pricing, setPricing] = useState({ packUses: 5, priceNaira: 1500, freeUses: 5 })
  const [paywallOpen, setPaywallOpen] = useState(false)
  const recent = useRef(new Map()) // download key -> when it was counted

  const applyStatus = useCallback((data) => {
    if (data && 'remaining' in data) setRemaining(data.remaining)
    if (data && 'paidRemaining' in data) setPaidRemaining(data.paidRemaining)
    if (data?.priceNaira) setPricing({ packUses: data.packUses, priceNaira: data.priceNaira, freeUses: data.freeUses })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await post('/api/usage', { action: 'status' })
      if (res.ok) applyStatus(await res.json())
    } catch {
      // offline / API down — leave the count unknown
    }
  }, [applyStatus])

  // On load: fetch the count, and if Paystack just sent the user back with a
  // reference, confirm it with the server and strip it from the URL.
  useEffect(() => {
    captureOwnerKey()
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (reference && reference.startsWith('ff_')) {
      window.history.replaceState({}, '', window.location.pathname)
      post('/api/pay-verify', { reference })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            setRemaining(data.remaining)
            showToast(`Payment received — you have ${data.remaining} uses`)
          } else {
            showToast(data.error || 'Payment could not be confirmed')
          }
        })
        .catch(() => showToast('Could not confirm payment. Please contact us.'))
    } else {
      refresh()
    }
  }, [refresh, showToast])

  /** Confirm a Paystack reference with the server and credit it. Resolves true when credited. */
  const verifyPayment = useCallback(
    async (reference) => {
      const res = await post('/api/pay-verify', { reference })
      if (!res.ok) return false
      await refresh()
      return true
    },
    [refresh]
  )

  /**
   * Spend one use for this download. Resolves true if the download may proceed.
   * `paid: true` (Studio exports) spends only purchased uses; on 402 it resolves
   * false without opening the tools paywall, so the caller shows its own checkout.
   */
  const requestUse = useCallback(
    async (key, { paid = false } = {}) => {
      const last = recent.current.get(key)
      if (last && Date.now() - last < REPEAT_WINDOW_MS) return true // re-downloading the same result
      try {
        const res = await post('/api/usage', { action: 'consume', paid })
        if (res.status === 402) {
          applyStatus(await res.json().catch(() => ({})))
          if (!paid) {
            setRemaining(0)
            setPaywallOpen(true)
          }
          return false
        }
        if (!res.ok) return true
        applyStatus(await res.json())
        recent.current.set(key, Date.now())
        return true
      } catch {
        return true
      }
    },
    [applyStatus]
  )

  const openPaywall = useCallback(() => {
    setRemaining(0)
    setPaywallOpen(true)
  }, [])
  const closePaywall = useCallback(() => setPaywallOpen(false), [])

  return (
    <UsageContext.Provider value={{ remaining, paidRemaining, pricing, paywallOpen, requestUse, verifyPayment, refresh, openPaywall, closePaywall }}>
      {children}
    </UsageContext.Provider>
  )
}

export function useUsage() {
  const ctx = useContext(UsageContext)
  if (!ctx) throw new Error('useUsage must be used within a UsageProvider')
  return ctx
}
