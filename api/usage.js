import { handleCors } from './_cors.js'
import { getRedis } from './_redis.js'
import { clientId, getRemaining, getPaidRemaining, consumeUse, consumePaidUse, isOwner, FREE_USES, PACK_USES, PRICE_KOBO } from './_usage.js'

// POST { action: 'status' | 'consume', paid?: true } -> { remaining, paidRemaining, ... }
// `paid: true` (Studio exports) spends only purchased uses, never the free trial.
// 402 when 'consume' is called with nothing left (client shows the paywall).
export default async function handler(req, res) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const redis = getRedis()
  const pricing = { freeUses: FREE_USES, packUses: PACK_USES, priceNaira: PRICE_KOBO / 100 }
  // Not configured -> report "unlimited" so downloads are never blocked by our own outage.
  if (!redis || isOwner(req)) return res.status(200).json({ remaining: null, paidRemaining: null, ...pricing })

  try {
    const id = clientId(req)
    if (req.body?.action === 'consume') {
      if (req.body?.paid) {
        const { ok, remaining, paidRemaining } = await consumePaidUse(redis, id)
        if (!ok) return res.status(402).json({ error: 'No paid uses left.', needsPayment: true, remaining, paidRemaining: 0, ...pricing })
        return res.status(200).json({ remaining, paidRemaining, ...pricing })
      }
      const { ok, remaining } = await consumeUse(redis, id)
      if (!ok) return res.status(402).json({ error: 'No uses left.', needsPayment: true, remaining: 0, ...pricing })
      return res.status(200).json({ remaining, paidRemaining: await getPaidRemaining(redis, id), ...pricing })
    }
    const [remaining, paidRemaining] = await Promise.all([getRemaining(redis, id), getPaidRemaining(redis, id)])
    return res.status(200).json({ remaining, paidRemaining, ...pricing })
  } catch (err) {
    console.error('Usage error:', err)
    return res.status(200).json({ remaining: null, paidRemaining: null, ...pricing })
  }
}
