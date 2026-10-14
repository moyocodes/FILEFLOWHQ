import { getRedis } from './_redis.js'
import {
  BOT,
  DEDUPE_SECONDS,
  EVENT_KINDS,
  cleanCountry,
  cleanPath,
  cleanTool,
  dayKey,
  deviceOf,
  heatCell,
  refHost,
  visitorId
} from './_analytics.js'

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

function parseBody(body) {
  if (!body) return null
  if (typeof body === 'object') return body
  try {
    return JSON.parse(body) // sendBeacon posts text/plain
  } catch {
    return null
  }
}

/**
 * POST /api/collect — one analytics hit from the site (see src/utils/analytics.js).
 *   { t: 'view', p: '/tools/svg-to-png', r: document.referrer }
 *   { t: 'upload' | 'download' | 'error', tool: 'svg-to-png', n?: count }
 * Always answers 204 quickly; analytics must never break the page.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  const ua = String(req.headers['user-agent'] || '')
  const hit = parseBody(req.body)
  const redis = getRedis()
  if (!hit || !redis || BOT.test(ua)) return res.status(204).end()

  const now = new Date()
  const d = dayKey(now)

  try {
    if (hit.t === 'view') {
      const path = cleanPath(hit.p)
      if (!path) return res.status(204).end()
      const secret = process.env.ANALYTICS_SALT || process.env.KV_REST_API_TOKEN || ''
      const visitor = visitorId({ ip: clientIp(req), ua, secret, date: now })

      // A refresh / revisit of the same page within 30 minutes counts once.
      const fresh = await redis.set(`an:dd:${visitor}:${path}`, 1, { nx: true, ex: DEDUPE_SECONDS })
      if (!fresh) return res.status(204).end()

      const country = cleanCountry(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'])
      const p = redis.pipeline()
      p.hincrby(`an:${d}:pv`, path, 1)
      p.hincrby(`an:${d}:ref`, refHost(hit.r), 1)
      p.hincrby(`an:${d}:dev`, deviceOf(ua), 1)
      p.hincrby(`an:${d}:cty`, country, 1)
      p.hincrby(`an:${d}:heat`, heatCell(now), 1)
      p.pfadd(`an:${d}:uv`, visitor)
      await p.exec()
    } else if (EVENT_KINDS.includes(hit.t)) {
      const n = Math.min(50, Math.max(1, Math.floor(Number(hit.n) || 1)))
      await redis.hincrby(`an:${d}:ev`, `${hit.t}:${cleanTool(hit.tool)}`, n)
    }
  } catch (err) {
    console.error('analytics collect failed', err)
  }
  return res.status(204).end()
}
