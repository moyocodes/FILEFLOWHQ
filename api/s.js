import { getRedis } from './_redis.js'
import { CODE_PATTERN } from './_url.js'

function notFound(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex')
  return res.status(404).send(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Link not found — FileFlowHQ</title>' +
      '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#10151a">' +
      '<h1>Link not found</h1><p>This short link does not exist or is no longer available.</p>' +
      '<p><a href="https://fileflowhq.com" style="color:#0e8f5c">Go to FileFlowHQ</a></p></body>'
  )
}

// GET /s/:code (rewritten to /api/s?code=:code in vercel.json) -> 302 to the
// stored URL. 302 rather than 301 so a link can be disabled later.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).end()
  }

  const code = req.query?.code
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return notFound(res)

  const redis = getRedis()
  if (!redis) {
    console.error('Upstash Redis env vars are not configured.')
    return res.status(500).end()
  }

  try {
    const url = await redis.get(`s:${code}`)
    if (typeof url !== 'string') return notFound(res)

    res.setHeader('X-Robots-Tag', 'noindex')
    // Cache at Vercel's edge briefly: popular links then cost no Redis reads,
    // which matters on the free tier.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300')
    res.setHeader('Location', url)
    return res.status(302).end()
  } catch (err) {
    console.error('Redirect lookup error:', err)
    return res.status(502).end()
  }
}
