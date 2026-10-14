import { randomUUID } from 'node:crypto'
import { handleCors } from './_cors.js'
import { getRedis } from './_redis.js'
import { clientId, PRICE_KOBO, CURRENCY, PACK_USES } from './_usage.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST { email } -> { authorizationUrl }. Starts a Paystack checkout for one
// pack of uses and remembers which client it belongs to, so the credit lands
// on the right allowance even if their IP changes before they come back.
export default async function handler(req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  const redis = getRedis()
  if (!secret || !redis) {
    console.error('Paystack or Redis env vars are not configured.')
    return res.status(500).json({ error: 'Payments are not available right now.' })
  }

  const email = String(req.body?.email || '').trim()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })

  try {
    const reference = `ff_${randomUUID().replace(/-/g, '')}`
    await redis.set(`pay:${reference}`, clientId(req), { ex: 60 * 60 * 24 * 30 })

    const site = process.env.SITE_URL || 'https://fileflowhq.com'
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: PRICE_KOBO,
        currency: CURRENCY,
        reference,
        callback_url: `${site}/`,
        metadata: { product: `${PACK_USES} uses` },
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.status) {
      console.error('Paystack initialize failed:', body)
      return res.status(502).json({ error: 'Could not start the payment. Please try again.' })
    }
    return res.status(200).json({ authorizationUrl: body.data.authorization_url, reference })
  } catch (err) {
    console.error('pay-init error:', err)
    return res.status(502).json({ error: 'Could not start the payment. Please try again.' })
  }
}
