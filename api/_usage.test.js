import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consumeUse, getRemaining, creditPayment, isOwner, FREE_USES, PACK_USES } from './_usage.js'

// Minimal in-memory stand-in for the Upstash client calls _usage.js makes.
function fakeRedis() {
  const m = new Map()
  return {
    m,
    async set(k, v, o) {
      if (o?.nx && m.has(k)) return null
      m.set(k, v)
      return 'OK'
    },
    async get(k) {
      return m.has(k) ? m.get(k) : null
    },
    async decr(k) {
      m.set(k, Number(m.get(k)) - 1)
      return m.get(k)
    },
    async incr(k) {
      m.set(k, Number(m.get(k)) + 1)
      return m.get(k)
    },
    async incrby(k, n) {
      m.set(k, Number(m.get(k)) + n)
      return m.get(k)
    },
    async del(k) {
      m.delete(k)
    },
  }
}

describe('usage allowance', () => {
  it('gives FREE_USES then blocks without going negative', async () => {
    const r = fakeRedis()
    for (let i = 0; i < FREE_USES; i++) expect((await consumeUse(r, 'a')).ok).toBe(true)
    expect((await consumeUse(r, 'a')).ok).toBe(false)
    expect(await getRemaining(r, 'a')).toBe(0)
  })
  it('keeps clients separate', async () => {
    const r = fakeRedis()
    await consumeUse(r, 'a')
    expect(await getRemaining(r, 'b')).toBe(FREE_USES)
  })
})

describe('creditPayment', () => {
  const ref = 'ff_' + 'a'.repeat(32)
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test'
  })
  const paystack = (data) =>
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: true, data }) })))

  it('credits once, however many times it is called', async () => {
    const r = fakeRedis()
    r.m.set(`pay:${ref}`, 'a')
    paystack({ status: 'success', amount: 150000, currency: 'NGN' })
    await creditPayment(r, ref)
    const second = await creditPayment(r, ref)
    expect(second.credited).toBe(false)
    expect(await getRemaining(r, 'a')).toBe(FREE_USES + PACK_USES)
  })
  it('rejects underpayment, failed payments and unknown references', async () => {
    const r = fakeRedis()
    r.m.set(`pay:${ref}`, 'a')
    paystack({ status: 'success', amount: 100, currency: 'NGN' })
    expect((await creditPayment(r, ref)).ok).toBe(false)
    paystack({ status: 'failed', amount: 150000, currency: 'NGN' })
    expect((await creditPayment(r, ref)).ok).toBe(false)
    paystack({ status: 'success', amount: 150000, currency: 'NGN' })
    expect((await creditPayment(fakeRedis(), ref)).reason).toBe('unknown_reference')
  })
})

describe('isOwner', () => {
  it('needs OWNER_KEY set and an exact match', () => {
    delete process.env.OWNER_KEY
    expect(isOwner({ headers: { 'x-owner-key': 'x' } })).toBe(false)
    process.env.OWNER_KEY = 'secret-key'
    expect(isOwner({ headers: { 'x-owner-key': 'secret-key' } })).toBe(true)
    expect(isOwner({ headers: { 'x-owner-key': 'secret-kex' } })).toBe(false)
    expect(isOwner({ headers: {} })).toBe(false)
  })
})
