import { useState, useCallback, useMemo } from 'react'
import { Copy, ExternalLink, Link2 } from 'lucide-react'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { apiUrl } from '../utils/api'

export default function useUrlShortener() {
  const [input, setInput] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const shorten = useCallback(async () => {
    setErrors([])
    setShortUrl('')
    const url = input.trim()
    if (!url) {
      setErrors(['Paste a URL first.'])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/shorten'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not shorten that link.')
      setShortUrl(data.shortUrl)
    } catch (err) {
      setErrors([err.message])
    }
    setLoading(false)
  }, [input])

  const copy = useCallback(async () => {
    if (!shortUrl) return
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setErrors(['Could not copy automatically — select the link and copy it manually.'])
    }
  }, [shortUrl])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Turn a long link into a short one. Unlike most tools here, this one sends the URL to our server so the
          short link can redirect to it.
        </p>

        <div>
          <label className="mb-1.5 block font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
            Long URL
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                shorten()
              }
            }}
            placeholder="https://example.com/a/very/long/link?with=parameters"
            rows={4}
            className="scrollbar-thin w-full resize-y rounded-card border border-border bg-transparent p-3 font-mono text-xs leading-relaxed"
          />
        </div>

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {shortUrl && (
          <div className="rounded-card border border-signal bg-signal-dim p-4">
            <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wide text-text-dim">Short link</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-sm font-semibold text-signal underline"
              >
                {shortUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    ),
    [input, errors, clearErrors, shortUrl, shorten]
  )

  const settings = useMemo(
    () => (
      <>
        <button
          onClick={shorten}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 rounded bg-signal px-4 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
          {loading ? 'Shortening…' : 'Shorten URL'}
        </button>

        <button
          onClick={copy}
          disabled={!shortUrl}
          className="flex items-center justify-center gap-1.5 rounded border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={shortUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!shortUrl}
          className={[
            'flex items-center justify-center gap-1.5 rounded border border-border px-4 py-2 text-sm font-medium',
            shortUrl ? '' : 'pointer-events-none opacity-40',
          ].join(' ')}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          Open link
        </a>

        <p className="mt-auto text-[0.7rem] leading-relaxed text-text-dim">
          Links are stored on our server and don&apos;t expire. Don&apos;t shorten links that contain private tokens.
        </p>
      </>
    ),
    [shorten, loading, copy, shortUrl, copied]
  )

  return { workspace, settings }
}
