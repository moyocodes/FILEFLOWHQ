import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Play, Pause, Square, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer } from '../utils/fileHelpers.js'
import { extractPageLines } from '../utils/pdfTextExtraction.js'

const THUMB_SCALE = 1.3

// Join a line's runs into text. pdf.js often splits a line into one run per
// word with no space characters in the run text itself (spacing is implied
// by run position, not glyphs) — joining with '' runs words together, so a
// space is inserted whenever there's a real horizontal gap between a run's
// right edge and the next run's start.
function lineRunsToText(line) {
  let text = ''
  let prevRightEdge = null
  for (const run of line.runs) {
    if (prevRightEdge !== null && run.x - prevRightEdge > 1 && !/^\s/.test(run.text) && !/\s$/.test(text)) {
      text += ' '
    }
    text += run.text
    prevRightEdge = run.x + (run.widthPt || 0)
  }
  return text
}

// Reuses the same reading-order line extraction as PDF to Text — punctuation
// and paragraph breaks stay in, which gives the speech synthesizer natural
// pause points instead of one run-on sentence per page.
function linesToSpeechText(lines) {
  const chunks = []
  lines.forEach((line, i) => {
    if (i > 0 && line.isParagraphStart) chunks.push('.')
    chunks.push(lineRunsToText(line))
  })
  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

export default function usePdfReadAloud() {
  const [file, setFile] = useState(null)
  const [pageTexts, setPageTexts] = useState([]) // string per page, 0-indexed
  const [pageThumbs, setPageThumbs] = useState([]) // data URL per page, 0-indexed
  const [currentPage, setCurrentPage] = useState(0) // 0-indexed
  const [errors, setErrors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [status, setStatus] = useState('idle') // 'idle' | 'speaking' | 'paused'
  const [voiceURI, setVoiceURI] = useState('')
  const [rate, setRate] = useState(1)
  const [voices, setVoices] = useState([])
  const [spokenRange, setSpokenRange] = useState(null) // { start, end } char offsets into the current page's text, or null

  const utteranceRef = useRef(null)

  useEffect(() => {
    const loadVoices = () => {
      // Only Google's voices are offered — Chromium exposes dozens of
      // OS-level voices (Samantha, Yuna, Zosia, ...) alongside them, several
      // of which fail to produce audio or drop onboundary/onend entirely for
      // certain engines/platforms. Google's voices behave consistently, so
      // narrowing the list avoids picking a voice known to silently break.
      const google = window.speechSynthesis.getVoices().filter((v) => /^Google /.test(v.name))
      setVoices(google)
      setVoiceURI((prev) => {
        if (prev && google.some((v) => v.voiceURI === prev)) return prev
        const defaultVoice = google.find((v) => v.lang?.startsWith('en')) || google[0]
        return defaultVoice ? defaultVoice.voiceURI : ''
      })
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // Stop any speech in progress whenever the tool unmounts (navigating away).
  useEffect(() => () => window.speechSynthesis.cancel(), [])

  const handleFiles = useCallback(async (files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    if (valid.length === 0) return

    window.speechSynthesis.cancel()
    setStatus('idle')
    setFile(valid[0])
    setPageTexts([])
    setPageThumbs([])
    setCurrentPage(0)
    setIsLoading(true)
    setLoadProgress(0)

    try {
      const buffer = await readAsArrayBuffer(valid[0])
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const texts = []
      const thumbs = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const lines = await extractPageLines(page)
        texts.push(linesToSpeechText(lines))

        const viewport = page.getViewport({ scale: THUMB_SCALE })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        thumbs.push(canvas.toDataURL('image/png'))

        setLoadProgress((i / pdf.numPages) * 100)
      }
      setPageTexts(texts)
      setPageThumbs(thumbs)
    } catch (err) {
      setErrors([
        /password/i.test(err.message)
          ? 'This PDF is password-protected and can’t be read in the browser.'
          : `Couldn’t read "${valid[0].name}". It may be corrupted or not a valid PDF.`,
      ])
    }
    setIsLoading(false)
  }, [])

  const speakPage = useCallback(
    (pageIndex) => {
      window.speechSynthesis.cancel()
      const text = pageTexts[pageIndex]
      if (!text) {
        setErrors(['This page has no extractable text (it may be a scanned image).'])
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = voices.find((v) => v.voiceURI === voiceURI)
      if (voice) utterance.voice = voice
      utterance.rate = rate
      utterance.onend = () => {
        setStatus('idle')
        setSpokenRange(null)
      }
      utterance.onerror = () => {
        setStatus('idle')
        setSpokenRange(null)
      }
      // 'word' boundary events give a charIndex/charLength into the utterance
      // text, which is the same string shown in the transcript panel — used
      // to highlight the word currently being spoken. Support varies (Safari
      // fires none, some engines only fire 'sentence'); the panel just shows
      // no highlight when boundary events don't arrive.
      utterance.onboundary = (e) => {
        if (e.name && e.name !== 'word') return
        const start = e.charIndex
        const length = e.charLength || text.slice(start).match(/^\S*/)[0].length
        setSpokenRange({ start, end: start + length })
      }
      utteranceRef.current = utterance
      setSpokenRange(null)
      window.speechSynthesis.speak(utterance)
      setStatus('speaking')
    },
    [pageTexts, voices, voiceURI, rate]
  )

  const play = useCallback(() => {
    if (status === 'paused') {
      window.speechSynthesis.resume()
      setStatus('speaking')
    } else {
      speakPage(currentPage)
    }
  }, [status, speakPage, currentPage])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setStatus('idle')
    setSpokenRange(null)
  }, [])

  const goToPage = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(pageTexts.length - 1, index))
      setCurrentPage(clamped)
      window.speechSynthesis.cancel()
      setStatus('idle')
      setSpokenRange(null)
    },
    [pageTexts.length]
  )

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
      <div className="space-y-4">
        {!file && (
          <p className="text-sm text-text-dim">
            Have a PDF read aloud, page by page, using your browser's built-in text-to-speech. Nothing is
            uploaded — the PDF is read and spoken entirely on your device.
          </p>
        )}

        {file ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 rounded-card border border-border bg-panel px-4 py-2.5">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-text-dim">
                {pageTexts.length > 0 ? `${pageTexts.length} page${pageTexts.length === 1 ? '' : 's'}` : 'Selected PDF'}
              </p>
            </div>
            <div className="w-56 flex-shrink-0">
              <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} compact />
            </div>
          </div>
        ) : (
          <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time" />
        )}
        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {isLoading && <ProgressBar label="Extracting text…" progress={loadProgress} />}

        {pageTexts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Previous page"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-border transition-colors hover:border-signal disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-text-dim">Page</span>
                <input
                  type="number"
                  min={1}
                  max={pageTexts.length}
                  value={currentPage + 1}
                  onChange={(e) => goToPage(Number(e.target.value) - 1)}
                  className="w-16 rounded border border-border bg-transparent px-2 py-1 text-center text-sm"
                />
                <span className="text-sm text-text-dim">of {pageTexts.length}</span>
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageTexts.length - 1}
                aria-label="Next page"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-border transition-colors hover:border-signal disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pageThumbs[currentPage] && (
                <div>
                  <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
                    Preview
                  </p>
                  <img
                    src={pageThumbs[currentPage]}
                    alt={`Page ${currentPage + 1} preview`}
                    className="max-h-80 w-full rounded-card border border-border object-contain"
                  />
                </div>
              )}

              <div>
                <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
                  Page {currentPage + 1} text
                </p>
                <div className="scrollbar-thin max-h-80 overflow-auto whitespace-pre-wrap rounded-card border border-border bg-panel p-4 font-mono text-xs leading-relaxed">
                  {pageTexts[currentPage]
                    ? spokenRange
                      ? [
                          pageTexts[currentPage].slice(0, spokenRange.start),
                          <mark key="spoken" className="rounded-sm bg-signal/30 text-text">
                            {pageTexts[currentPage].slice(spokenRange.start, spokenRange.end)}
                          </mark>,
                          pageTexts[currentPage].slice(spokenRange.end),
                        ]
                      : pageTexts[currentPage]
                    : '(No extractable text on this page)'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    [
      handleFiles,
      clearErrors,
      errors,
      file,
      pageTexts,
      pageThumbs,
      isLoading,
      loadProgress,
      currentPage,
      goToPage,
      spokenRange,
    ]
  )

  const settings = useMemo(
    () => (
      <>
        {voices.length > 0 && (
          <div className="field">
            <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
              Voice
            </label>
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">Default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            Speed — {rate.toFixed(1)}x
          </label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-1.5">
          {status === 'speaking' ? (
            <button
              onClick={pause}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
            >
              <Pause className="h-4 w-4" strokeWidth={2} />
              Pause
            </button>
          ) : (
            <button
              onClick={play}
              disabled={pageTexts.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" strokeWidth={2} />
              {status === 'paused' ? 'Resume' : 'Read this page'}
            </button>
          )}
          <button
            onClick={stop}
            disabled={status === 'idle'}
            aria-label="Stop"
            className="flex h-auto w-11 flex-shrink-0 items-center justify-center rounded border border-border transition-colors hover:border-signal disabled:opacity-40"
          >
            <Square className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {status !== 'idle' && (
          <p className="flex items-center gap-1.5 text-xs text-text-dim">
            <Volume2 className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            {status === 'speaking' ? `Reading page ${currentPage + 1}…` : 'Paused'}
          </p>
        )}
      </>
    ),
    [voices, voiceURI, rate, status, play, pause, stop, pageTexts.length, currentPage]
  )

  return { workspace, settings }
}
