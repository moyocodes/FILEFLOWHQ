// Shared CORS handling for the API functions. The underscore prefix keeps
// Vercel from exposing this file as its own endpoint.
//
// The website calls these functions same-origin, so it needs no CORS headers.
// The Chrome extension runs from a chrome-extension:// origin, so those
// requests are cross-origin and need an explicit allow.
const STORE_EXTENSION_ID = 'gjfjbeejnohhebifklghhhmdgjgbcbmf'

function allowedOrigins() {
  // EXTENSION_ORIGINS: optional comma-separated extra origins, e.g. the
  // chrome-extension://<id> of a locally loaded unpacked build.
  const extra = (process.env.EXTENSION_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return [`chrome-extension://${STORE_EXTENSION_ID}`, ...extra]
}

/**
 * Applies CORS headers for allowed extension origins and answers preflight.
 * Returns true if the request was a preflight and has been fully handled.
 */
export function handleCors(req, res) {
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
