import { Capacitor } from '@capacitor/core'

/*
 * Client side of the in-house analytics (server: api/collect.js). Sends tiny
 * fire-and-forget beacons — page views, files added, downloads, errors — with
 * no cookies and nothing stored on the device beyond the owner opt-out flag.
 *
 * Off in dev, in the Chrome extension (its privacy promise is no analytics)
 * and in the native apps. The owner's own browser can opt out from the
 * dashboard so their testing doesn't skew the numbers.
 */

const OPT_OUT_KEY = 'ffhq-analytics-optout'

function enabled() {
  if (import.meta.env.DEV && !import.meta.env.VITE_ANALYTICS_DEV) return false
  if (import.meta.env.MODE === 'extension' || Capacitor.isNativePlatform()) return false
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== '1'
  } catch {
    return true
  }
}

export function setAnalyticsOptOut(optOut) {
  try {
    if (optOut) localStorage.setItem(OPT_OUT_KEY, '1')
    else localStorage.removeItem(OPT_OUT_KEY)
  } catch {
    // storage blocked — nothing to persist
  }
}

export function isAnalyticsOptedOut() {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

function send(payload) {
  if (!enabled()) return
  const body = JSON.stringify(payload)
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/collect', new Blob([body], { type: 'text/plain' }))) return
  } catch {
    // fall through to fetch
  }
  fetch('/api/collect', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
}

/** The tool id of the current page (from /tools/<id>), or null. */
function currentTool() {
  const m = /^\/tools\/([a-z0-9-]+)/.exec(window.location.pathname)
  return m ? m[1] : null
}

export function trackView(path) {
  send({ t: 'view', p: path, r: document.referrer })
}

/** kind: 'upload' (files added) | 'download' | 'error'. */
export function trackEvent(kind, { tool = currentTool(), n = 1 } = {}) {
  send({ t: kind, tool: tool || 'none', n })
}
