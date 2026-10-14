import crypto from 'node:crypto'

// In-house, cookie-free analytics (modelled on LinqSafe's). Everything is
// stored as daily counters in Upstash Redis — no per-event rows, no IPs, no
// cookies. Key layout, one set per UTC day (d = YYYY-MM-DD):
//   an:{d}:pv    hash  page path        -> views
//   an:{d}:ev    hash  "kind:toolId"    -> count (upload | download | error)
//   an:{d}:ref   hash  referrer host    -> views ('' = direct)
//   an:{d}:dev   hash  mobile|tablet|desktop -> views
//   an:{d}:cty   hash  ISO country      -> views ('' = unknown)
//   an:{d}:heat  hash  "weekday:hour"   -> views (UTC, Monday = 0)
//   an:{d}:uv    HyperLogLog of that day's visitor ids (unique visitors)
//   an:dd:{visitor}:{path}  dedupe flag, expires after 30 minutes

export const EVENT_KINDS = ['upload', 'download', 'error']
export const RANGES = [7, 30, 90]
export const DEDUPE_SECONDS = 30 * 60

export const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|headless|lighthouse|python|axios|node-fetch/i

export const deviceOf = (ua = '') =>
  /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop'

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10)

/** Referrer → bare host; our own site counts as direct (''). */
export function refHost(ref, ownHost = 'fileflowhq.com') {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '').slice(0, 100)
    return h === ownHost || h === 'localhost' ? '' : h
  } catch {
    return ''
  }
}

/** Only our own routes, so random paths can't bloat the hashes. */
export function cleanPath(p) {
  if (typeof p !== 'string') return null
  const path = p.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return /^\/[a-z0-9/-]{0,80}$/.test(path) ? path : null
}

export const cleanTool = (t) => (typeof t === 'string' && /^[a-z0-9-]{1,40}$/.test(t) ? t : 'none')

export const cleanCountry = (c) => {
  const v = String(c || '').toUpperCase()
  return /^[A-Z]{2}$/.test(v) && !['XX', 'T1', 'ZZ'].includes(v) ? v : ''
}

/**
 * Cookie-free visitor id: a keyed hash of the day, IP and browser. Repeat
 * visits on the same day count once; the id changes every day so days can't
 * be linked, and the IP itself is never stored.
 */
export function visitorId({ ip = '', ua = '', secret = '', date = new Date() }) {
  return crypto.createHmac('sha256', secret).update(`${dayKey(date)}|${ip}|${ua}`).digest('hex').slice(0, 16)
}

/** Monday = 0 … Sunday = 6, plus the UTC hour, for the busiest-time grid. */
export function heatCell(date = new Date()) {
  return `${(date.getUTCDay() + 6) % 7}:${date.getUTCHours()}`
}

/** The last `n` UTC days, oldest first. */
export function lastDays(n, now = new Date()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    out.push(dayKey(d))
  }
  return out
}

/** Sum a list of {field: n} hashes into one, top `limit` entries, sorted. */
export function mergeHashes(hashes, limit = Infinity) {
  const total = {}
  for (const h of hashes) {
    if (!h) continue
    for (const [k, v] of Object.entries(h)) total[k] = (total[k] || 0) + Number(v || 0)
  }
  return Object.entries(total)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
}

const sum = (h) => Object.values(h || {}).reduce((t, v) => t + Number(v || 0), 0)
const kindTotal = (h, kind) =>
  Object.entries(h || {}).reduce((t, [k, v]) => (k.startsWith(`${kind}:`) ? t + Number(v || 0) : t), 0)

export const change = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 100) : null)

/**
 * Build the dashboard report from per-day hashes.
 * `perDay` is [{ date, pv, ev, ref, dev, cty, heat }] covering at least 14
 * days (for the week-over-week line); the report itself spans the last `days`.
 */
export function buildReport({ perDay, days, visitors }) {
  const range = perDay.slice(-days)
  const series = range.map((d) => ({
    date: d.date,
    views: sum(d.pv),
    uploads: kindTotal(d.ev, 'upload'),
    downloads: kindTotal(d.ev, 'download')
  }))
  const totals = (k) => series.reduce((t, s) => t + s[k], 0)

  const last14 = perDay.slice(-14)
  const weekSum = (slice, fn) => slice.reduce((t, d) => t + fn(d), 0)
  const now7 = last14.slice(-7)
  const prev7 = last14.slice(0, Math.max(0, last14.length - 7))
  const wViews = weekSum(now7, (d) => sum(d.pv))
  const wDownloads = weekSum(now7, (d) => kindTotal(d.ev, 'download'))

  const events = mergeHashes(range.map((d) => d.ev))
  const topDownload = events.find((e) => e.name.startsWith('download:') && e.name !== 'download:none')

  return {
    days,
    series,
    views: totals('views'),
    uploads: totals('uploads'),
    downloads: totals('downloads'),
    errors: range.reduce((t, d) => t + kindTotal(d.ev, 'error'), 0),
    visitors,
    week: {
      views: wViews,
      downloads: wDownloads,
      viewsChange: change(wViews, weekSum(prev7, (d) => sum(d.pv))),
      downloadsChange: change(wDownloads, weekSum(prev7, (d) => kindTotal(d.ev, 'download'))),
      topTool: topDownload ? { id: topDownload.name.slice('download:'.length), downloads: topDownload.n } : null
    },
    pages: mergeHashes(range.map((d) => d.pv)),
    events,
    referrers: mergeHashes(range.map((d) => d.ref), 10),
    devices: mergeHashes(range.map((d) => d.dev), 3),
    countries: mergeHashes(range.map((d) => d.cty), 12),
    heat: mergeHashes(range.map((d) => d.heat)).map(({ name, n }) => {
      const [d, h] = name.split(':').map(Number)
      return { d, h, n }
    })
  }
}

/** Constant-time token check for the dashboard API. */
export function tokenMatches(given, expected) {
  if (!expected || typeof given !== 'string') return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
