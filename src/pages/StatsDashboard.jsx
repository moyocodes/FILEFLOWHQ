import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  Download,
  Eye,
  FileUp,
  Globe2,
  LogOut,
  Percent,
  Smartphone,
  Table2,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react'
import { tools } from '../toolsConfig.js'
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '../utils/analytics.js'

/*
 * Private analytics dashboard at /admin/stats (not linked, noindex), modelled
 * on LinqSafe's. Reads /api/stats with the ANALYTICS_TOKEN the owner pastes in
 * once; the token stays in this browser only.
 */

const TOKEN_KEY = 'ffhq-stats-token'
const SERIES = [
  { key: 'views', label: 'Page views', color: 'var(--series-views)' },
  { key: 'uploads', label: 'Files added', color: 'var(--series-uploads)' },
  { key: 'downloads', label: 'Downloads', color: 'var(--series-downloads)' }
]

const toolById = Object.fromEntries(tools.map((t) => [t.id, t]))
const toolByPath = Object.fromEntries(tools.map((t) => [t.path, t]))
const pageName = (path) =>
  path === '/' ? 'Home' : toolByPath[path]?.name || path.replace(/^\//, '').replace(/^./, (c) => c.toUpperCase())

const regionName = (() => {
  try {
    const d = new Intl.DisplayNames(undefined, { type: 'region' })
    return (c) => d.of(c)
  } catch {
    return (c) => c
  }
})()
const flag = (c) => String.fromCodePoint(...[...c].map((ch) => 0x1f1a5 + ch.charCodeAt(0)))
const fmtDay = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const pct = (x) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`
const SOURCES = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'X / Twitter'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)chatgpt\.com$/, 'ChatGPT'],
  [/(^|\.)tiktok\.com$/, 'TikTok']
]
const sourceName = (host) => (!host ? 'Direct / unknown' : SOURCES.find(([re]) => re.test(host))?.[1] || host)

function Card({ title, icon: Icon, description, action, children, className = '' }) {
  return (
    <section className={`rounded-card bg-panel p-5 shadow-card sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[1rem] font-medium">
              {Icon && <Icon className="h-4 w-4 text-signal" strokeWidth={2} aria-hidden="true" />}
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[0.8rem] text-text-dim">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function Kpi({ icon: Icon, label, value, info }) {
  return (
    <div className="rounded-card bg-panel p-4 shadow-card" title={info}>
      <p className="flex items-center gap-1.5 text-[0.72rem] font-normal uppercase tracking-[0.08em] text-text-dim">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1 text-[1.8rem] font-semibold tabular-nums tracking-tight"
      >
        {value}
      </motion.p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-[0.78rem] text-text-dim">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function LineChart({ series }) {
  const wrap = useRef(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])
  const h = 240
  const pad = { l: 36, r: 12, t: 12, b: 24 }
  const max = Math.max(4, ...series.flatMap((s) => SERIES.map((x) => s[x.key])))
  const step = Math.ceil(max / 4)
  const top = step * 4
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, series.length - 1)
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / top)
  const path = (k) => series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join('')
  const labelEvery = Math.ceil(series.length / 6)

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (series.length - 1))
    setHover(Math.min(series.length - 1, Math.max(0, i)))
  }
  const hs = hover != null ? series[hover] : null

  return (
    <div ref={wrap} className="relative">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Daily page views, files added and downloads"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-none"
      >
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t * step)} y2={y(t * step)} stroke="var(--border)" />
            <text x={pad.l - 6} y={y(t * step)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--text-dim)" className="tabular-nums">
              {t * step}
            </text>
          </g>
        ))}
        {series.map(
          (s, i) =>
            i % labelEvery === 0 && (
              <text key={s.date} x={x(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--text-dim)">
                {fmtDay(s.date)}
              </text>
            )
        )}
        {SERIES.map((s, i) => (
          <motion.path
            key={s.key}
            d={path(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: i * 0.12 }}
          />
        ))}
        {hs && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--border-strong)" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(hs[s.key])} r="4.5" fill={s.color} stroke="var(--panel)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hs && (
        <div
          className="pointer-events-none absolute top-2 min-w-[150px] rounded-xl bg-panel px-3 py-2 text-xs shadow-lift"
          style={{ left: Math.min(Math.max(x(hover) - 75, 0), w - 160) }}
        >
          <p className="mb-1 font-medium">{fmtDay(hs.date)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center gap-1.5 text-text-dim">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <b className="ml-auto pl-3 tabular-nums text-text">{hs[s.key]}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function BarList({ rows, empty = 'No data yet.', color = 'var(--series-views)' }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  if (!rows.length) return <p className="py-6 text-center text-sm text-text-dim">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.key ?? r.label} title={`${r.label}: ${r.n}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              {r.icon}
              {r.label}
            </span>
            <span className="font-medium tabular-nums">{r.display ?? r.n.toLocaleString()}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-panel-raised">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(r.n / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`

// Day × hour grid of page views, shifted from UTC into the viewer's local time.
function BusiestTime({ heat }) {
  const off = Math.round(-new Date().getTimezoneOffset() / 60)
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const c of heat) {
    let h = c.h + off
    let d = c.d
    if (h >= 24) {
      h -= 24
      d = (d + 1) % 7
    } else if (h < 0) {
      h += 24
      d = (d + 6) % 7
    }
    grid[d][h] += c.n
  }
  const max = Math.max(0, ...grid.flat())
  let best = null
  grid.forEach((row, d) =>
    row.forEach((v, h) => {
      if (v && (!best || v > best.v)) best = { d, h, v }
    })
  )
  return (
    <div>
      <p className="mb-3 text-sm">
        {best ? (
          <>
            Busiest: <strong>{DAYS[best.d]}, {hourLabel(best.h)}–{hourLabel((best.h + 1) % 24)}</strong>
          </>
        ) : (
          'Not enough activity yet.'
        )}
      </p>
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          className="grid min-w-0 grid-cols-[1.75rem_repeat(24,minmax(0,1fr))] gap-px text-[10px] text-text-dim sm:grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] sm:gap-[2px]"
          role="img"
          aria-label={best ? `Busiest time ${DAYS[best.d]} ${hourLabel(best.h)}` : 'No activity yet'}
        >
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 6 === 0 ? hourLabel(h) : ''}
            </span>
          ))}
          {grid.map((row, d) => [
            <span key={`l${d}`} className="pr-1 leading-[1rem]">
              {DAYS[d]}
            </span>,
            ...row.map((v, h) => (
              <span
                key={`${d}-${h}`}
                title={`${DAYS[d]} ${hourLabel(h)}: ${v} views`}
                className="h-4 rounded-[3px]"
                style={{
                  background: v ? 'var(--series-views)' : 'var(--panel-raised)',
                  opacity: v ? 0.2 + 0.8 * (v / max) : 1
                }}
              />
            ))
          ])}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-text-dim">Darker = more page views. Shown in your local time.</p>
    </div>
  )
}

function WeekSummary({ week }) {
  const trend = (c, what) =>
    c == null ? null : c === 0 ? `the same ${what} as last week` : `${Math.abs(c)}% ${c > 0 ? 'more' : 'fewer'} ${what} than last week`
  const t = [trend(week.viewsChange, 'views'), trend(week.downloadsChange, 'downloads')].filter(Boolean)
  const parts = [t.length ? `FileFlowHQ got ${t.join(' and ')}.` : `This week: ${week.views} views and ${week.downloads} downloads.`]
  const top = week.topTool && toolById[week.topTool.id]
  if (top) parts.push(`${top.name} was the most-downloaded tool (${week.topTool.downloads}).`)
  const up = (week.downloadsChange ?? week.viewsChange ?? 0) >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-card bg-gradient-to-r from-signal-dim to-panel px-5 py-4 shadow-card"
    >
      <span className={`mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-panel ${up ? 'text-signal' : 'text-[#d95926]'}`}>
        {up ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
      </span>
      <p className="text-[1rem] leading-snug">
        <span className="mr-2 align-middle text-[0.68rem] font-medium uppercase tracking-[0.12em] text-text-dim">This week</span>
        {parts.join(' ')}
      </p>
    </motion.div>
  )
}

/** Per-tool funnel: page views → files added → downloads (+ errors). */
function toolRows(data) {
  const ev = Object.fromEntries(data.events.map((e) => [e.name, e.n]))
  const pv = Object.fromEntries(data.pages.map((p) => [p.name, p.n]))
  return tools
    .map((t) => {
      const views = pv[t.path] || 0
      const uploads = ev[`upload:${t.id}`] || 0
      const downloads = ev[`download:${t.id}`] || 0
      const errors = ev[`error:${t.id}`] || 0
      return { tool: t, views, uploads, downloads, errors, rate: views ? downloads / views : 0 }
    })
    .sort((a, b) => b.views - a.views || b.downloads - a.downloads)
}

function csvDownload(name, rows, columns) {
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = `${columns.join(',')}\n${rows.map((r) => columns.map((c) => cell(r[c])).join(',')).join('\n')}\n`
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function TokenGate({ onToken, error }) {
  const [value, setValue] = useState('')
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <div className="rounded-card bg-panel p-7 shadow-lift">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-[0.9rem] text-text-dim">Paste the ANALYTICS_TOKEN you set in Vercel. It's kept in this browser only.</p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim()) onToken(value.trim())
          }}
        >
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Access token"
            className="min-w-0 flex-1 rounded-full bg-panel-raised px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal"
          />
          <button className="rounded-full bg-signal px-5 py-2.5 text-sm font-medium text-white dark:text-void">Open</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}

export default function StatsDashboard() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || ''
    } catch {
      return ''
    }
  })
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [table, setTable] = useState(false)
  const [optOut, setOptOut] = useState(isAnalyticsOptedOut)

  useEffect(() => {
    document.title = 'Analytics | FileFlowHQ'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    if (!token) return
    let live = true
    setData(null)
    setError('')
    fetch(`/api/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw Object.assign(new Error(body.error || `Error ${r.status}`), { status: r.status })
        return body
      })
      .then((d) => {
        if (!live) return
        setData(d)
        try {
          localStorage.setItem(TOKEN_KEY, token)
        } catch {
          // storage blocked: the token just won't be remembered
        }
        // First successful sign-in: stop counting the owner's own visits.
        if (!localStorage.getItem('ffhq-analytics-optout-set')) {
          setAnalyticsOptOut(true)
          setOptOut(true)
          try {
            localStorage.setItem('ffhq-analytics-optout-set', '1')
          } catch {
            // ignore
          }
        }
      })
      .catch((e) => {
        if (!live) return
        setError(e.message)
        if (e.status === 401) setToken('')
      })
    return () => {
      live = false
    }
  }, [token, days])

  const rows = useMemo(() => (data ? toolRows(data) : []), [data])
  const toolViews = rows.reduce((t, r) => t + r.views, 0)

  if (!token) return <TokenGate onToken={setToken} error={error} />

  const signOut = () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setToken('')
    setData(null)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-signal">Private</p>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-medium tracking-tight">Analytics</h1>
          <p className="text-[0.85rem] text-text-dim">Cookie-free: no IPs stored, bots and refreshes within 30 minutes not counted.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full bg-panel px-3.5 py-2 text-[0.8rem] shadow-card">
            <input
              type="checkbox"
              checked={optOut}
              onChange={(e) => {
                setOptOut(e.target.checked)
                setAnalyticsOptOut(e.target.checked)
              }}
              className="accent-signal"
            />
            Don't count my visits
          </label>
          {data && (
            <button
              onClick={() =>
                csvDownload(`fileflowhq-daily-${days}d.csv`, data.series, ['date', 'views', 'uploads', 'downloads'])
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-panel px-3.5 py-2 text-[0.8rem] font-normal shadow-card"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Daily CSV
            </button>
          )}
          {data && (
            <button
              onClick={() =>
                csvDownload(
                  `fileflowhq-tools-${days}d.csv`,
                  rows.map((r) => ({ tool: r.tool.name, views: r.views, files_added: r.uploads, downloads: r.downloads, errors: r.errors, download_rate: pct(r.rate) })),
                  ['tool', 'views', 'files_added', 'downloads', 'errors', 'download_rate']
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-panel px-3.5 py-2 text-[0.8rem] font-normal shadow-card"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Tools CSV
            </button>
          )}
          <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-full bg-panel p-1 shadow-card">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                role="radio"
                aria-checked={days === d}
                onClick={() => setDays(d)}
                className={`relative rounded-full px-3.5 py-1.5 text-[0.8rem] font-normal ${days === d ? 'text-white dark:text-void' : 'text-text-dim hover:text-text'}`}
              >
                {days === d && (
                  <motion.span layoutId="range" className="absolute inset-0 rounded-full bg-signal" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{d} days</span>
              </button>
            ))}
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full bg-panel shadow-card">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-card bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      ) : !data ? (
        <div className="grid h-64 place-items-center text-sm text-text-dim">Loading analytics…</div>
      ) : (
        <>
          <WeekSummary week={data.week} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Kpi icon={Eye} label="Page views" value={data.views.toLocaleString()} info="Page loads. Bots and repeat views of the same page within 30 minutes aren't counted." />
            <Kpi icon={Users} label="Visitors" value={data.visitors.toLocaleString()} info="Distinct visitors per day (cookie-free), summed into an estimate for the range." />
            <Kpi icon={FileUp} label="Files added" value={data.uploads.toLocaleString()} info="Files dropped or picked into a tool." />
            <Kpi icon={Download} label="Downloads" value={data.downloads.toLocaleString()} info="Converted files saved." />
            <Kpi icon={Percent} label="Download rate" value={toolViews ? pct(data.downloads / toolViews) : '–'} info="Downloads ÷ tool page views." />
            <Kpi icon={AlertTriangle} label="Errors shown" value={data.errors.toLocaleString()} info="Error messages shown to people in a tool." />
          </div>

          <Card
            title="Activity"
            description={<Legend />}
            action={
              <button
                onClick={() => setTable(!table)}
                aria-pressed={table}
                className="inline-flex items-center gap-1.5 rounded-full bg-panel-raised px-3 py-1.5 text-xs font-normal"
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> {table ? 'Chart' : 'Table'}
              </button>
            }
          >
            {table ? (
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-panel text-left text-text-dim">
                    <tr>
                      <th className="py-1.5 font-normal">Date</th>
                      {SERIES.map((s) => (
                        <th key={s.key} className="text-right font-normal">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {[...data.series].reverse().map((s) => (
                      <tr key={s.date} className="odd:bg-panel-raised/50">
                        <td className="py-1.5">{fmtDay(s.date)}</td>
                        {SERIES.map((x) => (
                          <td key={x.key} className="text-right">
                            {s[x.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <LineChart series={data.series} />
            )}
          </Card>

          <Card title="Tools" description="Each tool's funnel: page views → files added → downloads. Download rate = downloads ÷ views.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-text-dim">
                  <tr>
                    <th className="py-2 font-normal">Tool</th>
                    <th className="text-right font-normal">Views</th>
                    <th className="text-right font-normal">Files added</th>
                    <th className="text-right font-normal">Downloads</th>
                    <th className="text-right font-normal">Errors</th>
                    <th className="text-right font-normal">Download rate</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rows.map((r, i) => {
                    const Icon = r.tool.icon
                    return (
                      <motion.tr
                        key={r.tool.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="odd:bg-panel-raised/50"
                      >
                        <td className="py-2">
                          <span className="flex items-center gap-2 font-normal">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal-dim text-signal">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            {r.tool.name}
                          </span>
                        </td>
                        <td className="text-right">{r.views}</td>
                        <td className="text-right">{r.uploads}</td>
                        <td className="text-right">{r.downloads}</td>
                        <td className="text-right">{r.errors || '–'}</td>
                        <td className="text-right">{r.views ? pct(r.rate) : '–'}</td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card title="Busiest time" icon={CalendarClock}>
              <BusiestTime heat={data.heat} />
            </Card>
            <Card title="Top pages" icon={Eye}>
              <BarList empty="No visits yet." rows={data.pages.slice(0, 8).map((p) => ({ key: p.name, label: pageName(p.name), n: p.n }))} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Countries" icon={Globe2} description="From Vercel's location header; the IP is never stored.">
              <BarList
                empty="No visits yet."
                rows={data.countries.map((c) => ({
                  key: c.name || 'xx',
                  label: c.name ? regionName(c.name) : 'Unknown',
                  n: c.n,
                  icon: <span aria-hidden="true">{c.name ? flag(c.name) : '🌐'}</span>
                }))}
              />
            </Card>
            <Card title="Where visitors come from">
              <BarList empty="No visits yet." rows={data.referrers.map((r) => ({ key: r.name || 'direct', label: sourceName(r.name), n: r.n }))} />
            </Card>
            <Card title="Devices" icon={Smartphone}>
              <BarList
                empty="No visits yet."
                rows={data.devices.map((d) => ({ key: d.name, label: d.name ? d.name[0].toUpperCase() + d.name.slice(1) : 'Unknown', n: d.n }))}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
