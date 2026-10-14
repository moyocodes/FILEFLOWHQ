import { getRedis } from './_redis.js'
import { RANGES, buildReport, lastDays, tokenMatches } from './_analytics.js'

const TABLES = ['pv', 'ev', 'ref', 'dev', 'cty', 'heat']

/**
 * GET /api/stats?days=7|30|90 — the analytics dashboard's report.
 * Requires `Authorization: Bearer <ANALYTICS_TOKEN>`.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expected = process.env.ANALYTICS_TOKEN
  if (!expected) return res.status(503).json({ error: 'Set ANALYTICS_TOKEN in Vercel to enable the dashboard.' })
  const auth = String(req.headers.authorization || '')
  if (!tokenMatches(auth.replace(/^Bearer\s+/i, ''), expected)) return res.status(401).json({ error: 'Wrong access token.' })

  const redis = getRedis()
  if (!redis) return res.status(503).json({ error: 'Upstash Redis is not configured.' })

  const days = RANGES.includes(Number(req.query?.days)) ? Number(req.query.days) : 30
  const dates = lastDays(Math.max(days, 14)) // ≥14 for the week-over-week summary

  try {
    const p = redis.pipeline()
    for (const d of dates) for (const t of TABLES) p.hgetall(`an:${d}:${t}`)
    const flat = await p.exec()
    const perDay = dates.map((date, i) => {
      const row = { date }
      TABLES.forEach((t, j) => {
        row[t] = flat[i * TABLES.length + j] || {}
      })
      return row
    })
    const visitors = await redis.pfcount(...dates.slice(-days).map((d) => `an:${d}:uv`))
    return res.status(200).json(buildReport({ perDay, days, visitors: Number(visitors) || 0 }))
  } catch (err) {
    console.error('analytics stats failed', err)
    return res.status(500).json({ error: 'Could not load analytics.' })
  }
}
