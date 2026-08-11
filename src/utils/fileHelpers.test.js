import { describe, it, expect } from 'vitest'
import { formatBytes, stripExtension, getExtension, validateFiles, MAX_FILE_SIZE } from './fileHelpers'

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes under 1KB with no decimal', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1536000)).toBe('1.5 MB')
  })

  it('returns an em dash for non-finite input', () => {
    expect(formatBytes(NaN)).toBe('—')
    expect(formatBytes(Infinity)).toBe('—')
  })
})

describe('stripExtension', () => {
  it('removes a simple extension', () => {
    expect(stripExtension('photo.png')).toBe('photo')
  })

  it('removes only the last extension', () => {
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar')
  })

  it('returns the name unchanged when there is no extension', () => {
    expect(stripExtension('README')).toBe('README')
  })
})

describe('getExtension', () => {
  it('extracts and lowercases the extension', () => {
    expect(getExtension('Photo.PNG')).toBe('png')
  })

  it('returns an empty string when there is no extension', () => {
    expect(getExtension('README')).toBe('')
  })
})

// validateFiles takes real File objects — these are available in the jsdom
// test environment, so we can construct them directly without mocking.
describe('validateFiles', () => {
  it('accepts files within the size limit and matching type', () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const { valid, errors } = validateFiles([file], { accept: ['.txt'] })

    expect(valid).toEqual([file])
    expect(errors).toEqual([])
  })

  it('rejects files over the max size', () => {
    const file = new File(['hello'], 'big.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })

    const { valid, errors } = validateFiles([file])

    expect(valid).toEqual([])
    expect(errors[0]).toMatch(/too large/)
  })

  it('rejects files with a disallowed extension', () => {
    const file = new File(['hello'], 'hello.exe', { type: 'application/octet-stream' })
    const { valid, errors } = validateFiles([file], { accept: ['.txt', '.pdf'] })

    expect(valid).toEqual([])
    expect(errors[0]).toMatch(/isn't a supported file type/)
  })

  it('matches wildcard MIME rules like "image/*"', () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' })
    const { valid, errors } = validateFiles([file], { accept: ['image/*'] })

    expect(valid).toEqual([file])
    expect(errors).toEqual([])
  })
})
