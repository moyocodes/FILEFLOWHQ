import { handleCors } from './_cors.js'
import { getRedis } from './_redis.js'
import { creditPayment } from './_usage.js'

// POST { reference } -> { remaining }. Called when Paystack sends the user
// back to the site. Safe to call repeatedly: credit is applied once.
export default async function handler(req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const reference = String(req.body?.reference || '')
  if (!/^ff_[a-f0-9]{32}$/.test(reference)) return res.status(400).json({ error: 'Invalid reference.' })

  const redis = getRedis()
  if (!redis) return res.status(500).json({ error: 'Payments are not available right now.' })

  try {
    const result = await creditPayment(redis, reference)
    if (!result.ok) return res.status(402).json({ error: 'Payment was not completed.', reason: result.reason })
    return res.status(200).json({ remaining: result.remaining, credited: result.credited })
  } catch (err) {
    console.error('pay-verify error:', err)
    return res.status(502).json({ error: 'Could not confirm the payment. Contact us with your reference.' })
  }
}
