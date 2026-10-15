import { isExtension } from './platform'

// The web app calls its own serverless functions with relative URLs. The
// extension and native apps have no same-origin backend, so they call the
// hosted site explicitly.
const API_BASE = isExtension ? 'https://fileflowhq.com' : ''

/** Resolve an API path like '/api/shorten' against the right host. */
export function apiUrl(path) {
  return `${API_BASE}${path}`
}

const OWNER_KEY_STORAGE = 'fileflowhq_owner_key'

/** Header proving the site owner (set once by visiting /?owner=<OWNER_KEY>). */
export function ownerHeaders() {
  try {
    const key = localStorage.getItem(OWNER_KEY_STORAGE)
    return key ? { 'X-Owner-Key': key } : {}
  } catch {
    return {}
  }
}

/** If the URL carries ?owner=<key>, remember it and strip it from the address bar. */
export function captureOwnerKey() {
  try {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('owner')
    if (!key) return
    localStorage.setItem(OWNER_KEY_STORAGE, key)
    params.delete('owner')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  } catch {
    // storage unavailable — owner exemption just won't apply on this device
  }
}
