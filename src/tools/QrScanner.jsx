import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { QrCode, Copy, ExternalLink, Check, Play, Square, Upload } from 'lucide-react'
import ErrorBanner from '../components/ErrorBanner.jsx'

/**
 * QR / Barcode Scanner — reads a code from the live camera or an uploaded image
 * and shows the decoded value with Copy and (for links) Open actions.
 *
 * Uses @zxing/browser's BrowserMultiFormatReader, which drives getUserMedia
 * directly. That same code path works in a desktop/mobile browser AND inside the
 * Capacitor WebView, so there is no separate native plugin to maintain. The same
 * reader instance also decodes static images via decodeFromImageUrl.
 */

function isLikelyUrl(text) {
  if (/^https?:\/\/\S+$/i.test(text)) return true
  // Bare domains like "example.com/path" — treat as a URL we can prefix.
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text)
}

function toHref(text) {
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

export default function useQrScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) // most recent decoded string
  const [history, setHistory] = useState([]) // recent decodes this session
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(false)

  const videoRef = useRef(null)
  const controlsRef = useRef(null) // zxing scanner controls (has .stop())
  const readerRef = useRef(null)
  const fileInputRef = useRef(null)

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }, [])

  const handleDecoded = useCallback((text) => {
    setResult(text)
    setCopied(false)
    setHistory((prev) => (prev[0] === text ? prev : [text, ...prev].slice(0, 8)))
  }, [])

  const getReader = useCallback(async () => {
    if (readerRef.current) return readerRef.current
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const { DecodeHintType } = await import('@zxing/library')
    // TRY_HARDER matters a lot for continuous video decoding — without it zxing-js
    // gives up too easily on real-world frames (motion blur, glare, small codes).
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    readerRef.current = new BrowserMultiFormatReader(hints)
    return readerRef.current
  }, [])

  const start = useCallback(async () => {
    setErrors([])
    try {
      const reader = await getReader()

      setScanning(true)
      // deviceId undefined => zxing picks a camera (prefers the rear one).
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (res, err, controls) => {
          if (res) {
            handleDecoded(res.getText())
            controls.stop()
            controlsRef.current = null
            setScanning(false)
          }
          // Per-frame "not found" errors are normal noise — ignore them.
        }
      )
    } catch (err) {
      setScanning(false)
      const msg = (err && (err.message || String(err))) || ''
      if (/permission|denied|NotAllowed/i.test(msg)) {
        setErrors(['Camera access was blocked. Allow camera permission and try again.'])
      } else if (/NotFound|no.*device/i.test(msg)) {
        setErrors(['No camera was found on this device.'])
      } else {
        setErrors(['Could not start the scanner. ' + msg])
      }
    }
  }, [handleDecoded, getReader])

  const decodeFile = useCallback(
    async (file) => {
      if (!file) return
      setErrors([])
      const url = URL.createObjectURL(file)
      try {
        const reader = await getReader()
        const res = await reader.decodeFromImageUrl(url)
        handleDecoded(res.getText())
      } catch {
        setErrors(['No QR code or barcode was found in that image.'])
      } finally {
        URL.revokeObjectURL(url)
      }
    },
    [handleDecoded, getReader]
  )

  const pickFile = useCallback(() => fileInputRef.current?.click(), [])

  const onFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      e.target.value = '' // allow re-selecting the same file
      decodeFile(file)
    },
    [decodeFile]
  )

  // Always release the camera when the tool unmounts (navigating away).
  useEffect(() => () => controlsRef.current?.stop(), [])

  const copy = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setErrors(['Could not copy to the clipboard.'])
    }
  }, [result])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Point your camera at a QR code or barcode, or upload an image, to read it.
          Decoding happens on your device — nothing is uploaded.
        </p>

        <div className="relative overflow-hidden rounded-card border border-border bg-black">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-panel/95 text-center">
              <QrCode className="h-8 w-8 text-text-dim" strokeWidth={1.75} />
              <p className="text-sm text-text-dim">Camera is off</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={start}
                  className="flex items-center gap-2 rounded bg-signal px-4 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" strokeWidth={2} />
                  Start scanning
                </button>
                <button
                  onClick={pickFile}
                  className="flex items-center gap-2 rounded border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-signal"
                >
                  <Upload className="h-4 w-4" strokeWidth={2} />
                  Upload image
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {result && (
          <div className="space-y-3 rounded-card border border-border bg-panel p-4">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-text-dim">
              Result
            </p>
            <p className="break-all text-sm text-text">{result}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-signal"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-signal" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {isLikelyUrl(result) && (
                <a
                  href={toHref(result)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-signal"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  Open link
                </a>
              )}
            </div>
          </div>
        )}

        {history.length > 1 && (
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-text-dim">
              Recent scans
            </p>
            <ul className="space-y-1.5">
              {history.slice(1).map((h, i) => (
                <li
                  key={i}
                  className="truncate rounded border border-border bg-panel px-3 py-2 text-xs text-text-dim"
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
    [scanning, start, pickFile, onFileChange, errors, clearErrors, result, copy, copied, history]
  )

  const settings = useMemo(
    () => (
      <>
        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            Scanner
          </label>
          <p className="text-xs leading-relaxed text-text-dim">
            Reads QR codes and common barcodes (EAN, UPC, Code 128, and more) using
            your camera or an uploaded image. The scanner stops automatically after a
            successful read.
          </p>
        </div>

        {scanning ? (
          <button
            onClick={stop}
            className="mt-auto flex w-full flex-shrink-0 items-center justify-center gap-2 rounded border border-border px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-signal"
          >
            <Square className="h-4 w-4" strokeWidth={2} />
            Stop scanning
          </button>
        ) : (
          <button
            onClick={start}
            className="mt-auto flex w-full flex-shrink-0 items-center justify-center gap-2 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            {result ? 'Scan again' : 'Start scanning'}
          </button>
        )}
      </>
    ),
    [scanning, start, stop, result]
  )

  return { workspace, settings }
}
