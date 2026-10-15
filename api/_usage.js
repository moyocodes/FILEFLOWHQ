// Shared usage-allowance + Paystack helpers. The underscore prefix keeps
// Vercel from exposing this file as its own endpoint.
//
// Model: every client (identified by hashed IP, so clearing storage or
// switching browsers doesn't reset it) has an allowance counter in Redis.
// It starts at FREE_USES; each download consumes 1; a successful Paystack
// payment adds PACK_USES.
import { createHash, timingSafeEqual } from 'node:crypto'

export const FREE_USES = 5
export const PACK_USES = 5
export const PRICE_KOBO = 150000 // ₦1,500
export const CURRENCY = 'NGN'

const allowKey = (id) => `allow:${id}`
// Paid uses still unspent (a subset of allow). Studio exports may only spend these.
const paidKey = (id) => `paidallow:${id}`

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

/** Stable, non-reversible id for the caller's IP (raw IPs are never stored). */
export function clientId(req) {
  const salt = process.env.USAGE_SALT || 'fileflowhq'
  return createHash('sha256').update(`${salt}:${clientIp(req)}`).digest('hex').slice(0, 32)
}

/** Remaining uses, creating the allowance with the free tier on first sight. */
export async function getRemaining(redis, id) {
  await redis.set(allowKey(id), FREE_USES, { nx: true })
  return Math.max(0, Number(await redis.get(allowKey(id))) || 0)
}

/** Paid uses left: never more than the overall allowance (tools may have spent some). */
export async function getPaidRemaining(redis, id) {
  const [paid, all] = await Promise.all([redis.get(paidKey(id)), getRemaining(redis, id)])
  return Math.max(0, Math.min(Number(paid) || 0, all))
}

/**
 * Spend one *paid* use (Studio save/export: the free trial doesn't cover it).
 * Returns { ok, remaining, paidRemaining }.
 */
export async function consumePaidUse(redis, id) {
  if ((await getPaidRemaining(redis, id)) < 1) return { ok: false, remaining: await getRemaining(redis, id), paidRemaining: 0 }
  const paidLeft = await redis.decr(paidKey(id))
  if (paidLeft < 0) {
    await redis.incr(paidKey(id))
    return { ok: false, remaining: await getRemaining(redis, id), paidRemaining: 0 }
  }
  const { ok, remaining } = await consumeUse(redis, id)
  if (!ok) {
    await redis.incr(paidKey(id))
    return { ok: false, remaining: 0, paidRemaining: 0 }
  }
  return { ok: true, remaining, paidRemaining: Math.min(paidLeft, remaining) }
}

/** Atomically spend one use. Returns { ok, remaining }. */
export async function consumeUse(redis, id) {
  await redis.set(allowKey(id), FREE_USES, { nx: true })
  const left = await redis.decr(allowKey(id))
  if (left < 0) {
    await redis.incr(allowKey(id)) // undo; never leave the counter negative
    return { ok: false, remaining: 0 }
  }
  return { ok: true, remaining: left }
}

/**
 * Verifies a Paystack transaction with Paystack itself (never trusting the
 * browser or the webhook body) and credits the client that started it —
 * exactly once per reference, however many times this is called.
 */
export async function creditPayment(redis, reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return { ok: false, reason: 'not_configured' }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.status || body.data?.status !== 'success') return { ok: false, reason: 'not_successful' }
  if (body.data.currency !== CURRENCY || body.data.amount < PRICE_KOBO) return { ok: false, reason: 'wrong_amount' }

  const id = await redis.get(`pay:${reference}`)
  if (!id) return { ok: false, reason: 'unknown_reference' }

  await redis.set(allowKey(id), FREE_USES, { nx: true })
  const firstTime = await redis.set(`paid:${reference}`, '1', { nx: true })
  if (firstTime) {
    try {
      await redis.incrby(allowKey(id), PACK_USES)
      await redis.incrby(paidKey(id), PACK_USES)
    } catch (err) {
      await redis.del(`paid:${reference}`) // let a retry credit it
      throw err
    }
  }
  return { ok: true, credited: Boolean(firstTime), remaining: await getRemaining(redis, id) }
}

/**
 * True for the site owner, who is never charged. Proven by a secret key
 * (OWNER_KEY env var) sent as X-Owner-Key — not by an email address, which
 * anyone could simply type. Disabled entirely when OWNER_KEY is unset.
 */
export function isOwner(req) {
  const expected = process.env.OWNER_KEY
  const given = req.headers['x-owner-key']
  if (!expected || typeof given !== 'string' || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
