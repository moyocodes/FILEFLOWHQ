import { describe, it, expect } from 'vitest'
import {
  buildReport,
  cleanCountry,
  cleanPath,
  cleanTool,
  deviceOf,
  heatCell,
  lastDays,
  mergeHashes,
  refHost,
  tokenMatches,
  visitorId
} from './_analytics.js'

describe('analytics helpers', () => {
  it('normalizes paths and rejects junk', () => {
    expect(cleanPath('/tools/svg-to-png?x=1')).toBe('/tools/svg-to-png')
    expect(cleanPath('/privacy/')).toBe('/privacy')
    expect(cleanPath('/')).toBe('/')
    expect(cleanPath('/<script>')).toBeNull()
    expect(cleanPath(42)).toBeNull()
  })

  it('treats own site and bad referrers as direct', () => {
    expect(refHost('https://www.google.com/search?q=x')).toBe('google.com')
    expect(refHost('https://fileflowhq.com/tools')).toBe('')
    expect(refHost('not a url')).toBe('')
  })

  it('classifies devices, tools and countries', () => {
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile')
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet')
    expect(deviceOf('Mozilla/5.0 (Macintosh)')).toBe('desktop')
    expect(cleanTool('svg-to-png')).toBe('svg-to-png')
    expect(cleanTool('<x>')).toBe('none')
    expect(cleanCountry('ng')).toBe('NG')
    expect(cleanCountry('XX')).toBe('')
  })

  it('gives a stable visitor id within a day and a new one the next day', () => {
    const base = { ip: '1.2.3.4', ua: 'UA', secret: 's' }
    const a = visitorId({ ...base, date: new Date('2026-10-14T01:00:00Z') })
    const b = visitorId({ ...base, date: new Date('2026-10-14T23:00:00Z') })
    const c = visitorId({ ...base, date: new Date('2026-10-15T01:00:00Z') })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toHaveLength(16)
  })

  it('maps time to a Monday-first weekday and UTC hour', () => {
    expect(heatCell(new Date('2026-10-12T09:30:00Z'))).toBe('0:9') // Monday
    expect(heatCell(new Date('2026-10-18T23:00:00Z'))).toBe('6:23') // Sunday
  })

  it('lists the last n days oldest first', () => {
    expect(lastDays(3, new Date('2026-10-01T12:00:00Z'))).toEqual(['2026-09-29', '2026-09-30', '2026-10-01'])
  })

  it('merges and ranks hashes', () => {
    expect(mergeHashes([{ a: '2', b: 1 }, { a: 1, c: 5 }, null], 2)).toEqual([
      { name: 'c', n: 5 },
      { name: 'a', n: 3 }
    ])
  })

  it('builds a report with week-over-week change', () => {
    const perDay = lastDays(14, new Date('2026-10-14T00:00:00Z')).map((date, i) => ({
      date,
      pv: { '/': i < 7 ? 1 : 2 },
      ev: { 'download:svg-to-png': 1, 'upload:svg-to-png': 2, 'error:none': i === 13 ? 1 : 0 },
      ref: {},
      dev: { mobile: 1 },
      cty: { NG: 1 },
      heat: { '0:9': 1 }
    }))
    const r = buildReport({ perDay, days: 7, visitors: 5 })
    expect(r.series).toHaveLength(7)
    expect(r.views).toBe(14)
    expect(r.downloads).toBe(7)
    expect(r.uploads).toBe(14)
    expect(r.errors).toBe(1)
    expect(r.week.viewsChange).toBe(100)
    expect(r.week.downloadsChange).toBe(0)
    expect(r.week.topTool).toEqual({ id: 'svg-to-png', downloads: 7 })
    expect(r.heat).toEqual([{ d: 0, h: 9, n: 7 }])
  })

  it('compares tokens safely', () => {
    expect(tokenMatches('abc', 'abc')).toBe(true)
    expect(tokenMatches('abd', 'abc')).toBe(false)
    expect(tokenMatches('abc', '')).toBe(false)
    expect(tokenMatches(undefined, 'abc')).toBe(false)
  })
})
