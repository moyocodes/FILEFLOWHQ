import { randomBytes } from 'node:crypto'

// Shared helpers for the URL shortener. The underscore prefix keeps Vercel
// from exposing this file as its own endpoint.

export const MAX_URL_LENGTH = 2048
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const CODE_LENGTH = 7
export const CODE_PATTERN = /^[0-9A-Za-z]{4,16}$/

// Hosts we refuse to shorten: ourselves (prevents redirect loops and
// shortener-of-shortener chains) and obviously non-public addresses.
const SELF_HOSTS = ['fileflowhq.com', 'www.fileflowhq.com']

function isPrivateHost(hostname) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return true
  if (/^\[.*\]$/.test(hostname)) return true // any IPv6 literal
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

/**
 * Validates and normalises a URL to shorten. Returns { ok: true, url } with the
 * normalised href, or { ok: false, error } with a user-facing message.
 */
export function validateTargetUrl(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'Enter a URL to shorten.' }
  }
  const raw = input.trim()
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, error: `That URL is too long (max ${MAX_URL_LENGTH} characters).` }
  }

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, error: 'That does not look like a valid URL. Include https://.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links can be shortened.' }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Links containing a username or password are not allowed.' }
  }
  if (SELF_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { ok: false, error: 'That link is already a FileFlowHQ link.' }
  }
  if (isPrivateHost(parsed.hostname.toLowerCase())) {
    return { ok: false, error: 'That address is not a public website.' }
  }

  return { ok: true, url: parsed.href }
}

/** Random base62 code, unbiased (rejection sampling). */
export function generateCode(length = CODE_LENGTH) {
  let out = ''
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248 && out.length < length) out += ALPHABET[byte % 62] // 248 = 62 * 4
    }
  }
  return out
}
