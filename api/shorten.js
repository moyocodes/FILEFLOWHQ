import { handleCors } from './_cors.js'
import { getRedis } from './_redis.js'
import { validateTargetUrl, generateCode } from './_url.js'

const RATE_LIMIT = 10 // new links per IP per window
const RATE_WINDOW_SECONDS = 60
const MAX_CODE_ATTEMPTS = 5

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

// Vercel serverless function. Stores code -> URL in Upstash Redis; the
// redirect itself is served by api/s.js at /s/:code (see vercel.json).
export default async function handler(req, res) {
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const check = validateTargetUrl(req.body?.url)
  if (!check.ok) return res.status(400).json({ error: check.error })

  const redis = getRedis()
  if (!redis) {
    console.error('Upstash Redis env vars are not configured.')
    return res.status(500).json({ error: 'Link shortening is not configured.' })
  }

  try {
    // Fixed-window rate limit per IP. Keeps the free Redis tier from being
    // drained and makes bulk abuse expensive.
    const rateKey = `rl:${clientIp(req)}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, RATE_WINDOW_SECONDS)
    if (count > RATE_LIMIT) {
      res.setHeader('Retry-After', String(RATE_WINDOW_SECONDS))
      return res.status(429).json({ error: 'Too many links created. Try again in a minute.' })
    }

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateCode()
      // NX: only set if the code is unused, so two links never collide.
      const stored = await redis.set(`s:${code}`, check.url, { nx: true })
      if (stored) {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'fileflowhq.com'
        return res.status(200).json({ code, shortUrl: `https://${host}/s/${code}` })
      }
    }
    return res.status(503).json({ error: 'Could not create a link. Please try again.' })
  } catch (err) {
    console.error('Shorten error:', err)
    return res.status(502).json({ error: 'Could not create the short link.' })
  }
}
