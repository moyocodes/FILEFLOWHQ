import { describe, it, expect } from 'vitest'
import { validateTargetUrl, generateCode, CODE_PATTERN, CODE_LENGTH, MAX_URL_LENGTH } from './_url.js'

describe('validateTargetUrl', () => {
  it('accepts and normalises http/https URLs', () => {
    expect(validateTargetUrl('  https://example.com/a?b=1 ')).toEqual({ ok: true, url: 'https://example.com/a?b=1' })
    expect(validateTargetUrl('http://example.com').ok).toBe(true)
  })

  it('rejects empty and non-string input', () => {
    expect(validateTargetUrl('').ok).toBe(false)
    expect(validateTargetUrl('   ').ok).toBe(false)
    expect(validateTargetUrl(undefined).ok).toBe(false)
    expect(validateTargetUrl(42).ok).toBe(false)
  })

  it('rejects invalid URLs and non-http schemes', () => {
    expect(validateTargetUrl('not a url').ok).toBe(false)
    expect(validateTargetUrl('example.com').ok).toBe(false)
    expect(validateTargetUrl('javascript:alert(1)').ok).toBe(false)
    expect(validateTargetUrl('data:text/html,<script>alert(1)</script>').ok).toBe(false)
    expect(validateTargetUrl('ftp://example.com/file').ok).toBe(false)
  })

  it('rejects credentials in the URL', () => {
    expect(validateTargetUrl('https://user:pass@example.com').ok).toBe(false)
  })

  it('rejects our own links', () => {
    expect(validateTargetUrl('https://fileflowhq.com/s/abc1234').ok).toBe(false)
    expect(validateTargetUrl('https://WWW.fileflowhq.com/').ok).toBe(false)
  })

  it('rejects localhost and private addresses', () => {
    for (const u of [
      'http://localhost:3000',
      'http://foo.localhost',
      'http://127.0.0.1',
      'http://10.0.0.5',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254',
      'http://[::1]/',
    ]) {
      expect(validateTargetUrl(u).ok, u).toBe(false)
    }
    expect(validateTargetUrl('http://172.32.0.1').ok).toBe(true) // outside 172.16/12
  })

  it('rejects over-long URLs', () => {
    expect(validateTargetUrl('https://example.com/' + 'a'.repeat(MAX_URL_LENGTH)).ok).toBe(false)
  })
})

describe('generateCode', () => {
  it('returns base62 codes of the expected length', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode()
      expect(code).toHaveLength(CODE_LENGTH)
      expect(CODE_PATTERN.test(code)).toBe(true)
    }
  })

  it('is not constant', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateCode()))
    expect(codes.size).toBeGreaterThan(95)
  })
})
