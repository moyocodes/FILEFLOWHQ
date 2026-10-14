import { createHmac, timingSafeEqual } from 'node:crypto'
import { getRedis } from './_redis.js'
import { creditPayment } from './_usage.js'

// The signature is computed over the exact raw bytes, so the body parser is off.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Paystack -> us. Backstop for users who pay but close the tab before the
// redirect back. Set this URL in the Paystack dashboard (Settings > API Keys
// & Webhooks): https://fileflowhq.com/api/pay-webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = process.env.PAYSTACK_SECRET_KEY
  const redis = getRedis()
  if (!secret || !redis) return res.status(500).end()

  const raw = await readRawBody(req)
  const expected = createHmac('sha512', secret).update(raw).digest('hex')
  const given = String(req.headers['x-paystack-signature'] || '')
  const valid =
    given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!valid) return res.status(401).end()

  try {
    const event = JSON.parse(raw.toString('utf8'))
    const reference = event?.data?.reference
    if (event?.event === 'charge.success' && /^ff_[a-f0-9]{32}$/.test(reference || '')) {
      await creditPayment(redis, reference) // re-verifies with Paystack, credits once
    }
    return res.status(200).end()
  } catch (err) {
    console.error('pay-webhook error:', err)
    return res.status(500).end() // Paystack retries on non-2xx
  }
}
