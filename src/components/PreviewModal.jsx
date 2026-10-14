import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Download, Eye, FileArchive, Loader2, X } from 'lucide-react'
import { usePreview } from '../context/PreviewContext.jsx'
import { formatBytes, getExtension } from '../utils/fileHelpers.js'

const MAX_PDF_PAGES = 30
const MAX_TEXT_CHARS = 60_000

function kindOf(blob, name) {
  const ext = getExtension(name)
  const type = blob.type || ''
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'svg'].includes(ext)) return 'image'
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'zip' || type === 'application/zip') return 'zip'
  if (type.startsWith('text/') || ['json', 'csv', 'txt', 'md'].includes(ext)) return 'text'
  return 'unknown'
}

function ImagePreview({ blob }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return (
    <div
      className="flex min-h-[240px] items-center justify-center rounded-2xl p-3"
      // Checkerboard so transparent PNG/WebP areas are visible.
      style={{ backgroundImage: 'repeating-conic-gradient(var(--panel-raised) 0% 25%, var(--panel) 0% 50%)', backgroundSize: '20px 20px' }}
    >
      <img src={url} alt="Converted image preview" className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-card" />
    </div>
  )
}

/** Renders each PDF page to an image so it previews the same on iOS (iframes only show page 1 there). */
function PdfPreview({ blob }) {
  const [pages, setPages] = useState([])
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    const urls = []
    ;(async () => {
      try {
        const { default: pdfjsLib } = await import('../utils/pdfjsSetup.js')
        const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise
        if (cancelled) return
        setTotal(pdf.numPages)
        for (let i = 1; i <= Math.min(pdf.numPages, MAX_PDF_PAGES); i++) {
          const page = await pdf.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: Math.min(2, 900 / base.width) })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          const out = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
          canvas.width = canvas.height = 0 // free canvas memory (iOS)
          if (cancelled || !out) return
          const u = URL.createObjectURL(out)
          urls.push(u)
          setPages((p) => [...p, u])
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [blob])

  if (failed) return <p className="py-10 text-center text-sm text-text-dim">This PDF can't be previewed, but you can still download it.</p>
  return (
    <div className="space-y-4">
      {pages.map((u, i) => (
        <div key={u}>
          <img src={u} alt={`Page ${i + 1}`} className="mx-auto w-full max-w-[720px] rounded-lg bg-white shadow-card" />
          <p className="mt-1.5 text-center text-[0.72rem] text-text-dim">
            Page {i + 1} of {total}
          </p>
        </div>
      ))}
      {pages.length < Math.min(total, MAX_PDF_PAGES) || total === 0 ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-dim">
          <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
        </div>
      ) : (
        total > MAX_PDF_PAGES && (
          <p className="text-center text-[0.8rem] text-text-dim">Showing the first {MAX_PDF_PAGES} of {total} pages.</p>
        )
      )}
    </div>
  )
}

function DocxPreview({ blob }) {
  const [html, setHtml] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { default: mammoth } = await import('mammoth')
        const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() })
        if (!cancelled) setHtml(value)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [blob])
  if (failed) return <p className="py-10 text-center text-sm text-text-dim">This document can't be previewed, but you can still download it.</p>
  if (html == null) return <Spinner />
  // mammoth output is plain semantic HTML (no scripts); links open in a new tab.
  return (
    <div className="mx-auto max-w-[720px] rounded-lg bg-white p-8 text-[#111] shadow-card">
      <div
        className="docx-preview space-y-3 text-[0.92rem] leading-relaxed [&_a]:text-[#0e6fbf] [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_td]:border [&_td]:border-[#ccc] [&_td]:p-1.5 [&_ul]:list-disc"
        onClick={(e) => {
          const a = e.target.closest('a')
          if (a) {
            e.preventDefault()
            window.open(a.href, '_blank', 'noopener,noreferrer')
          }
        }}
        dangerouslySetInnerHTML={{ __html: sanitize(html) }}
      />
    </div>
  )
}

/** Strip anything executable from converter HTML before rendering it. */
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
      if (['href', 'src'].includes(attr.name) && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
    }
  })
  return doc.body.innerHTML
}

function TextPreview({ blob }) {
  const [text, setText] = useState(null)
  useEffect(() => {
    let cancelled = false
    blob.text().then((t) => !cancelled && setText(t))
    return () => {
      cancelled = true
    }
  }, [blob])
  if (text == null) return <Spinner />
  const cut = text.length > MAX_TEXT_CHARS
  return (
    <div>
      <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-panel-raised p-4 font-mono text-[0.78rem] leading-relaxed">
        {cut ? text.slice(0, MAX_TEXT_CHARS) : text}
      </pre>
      {cut && <p className="mt-2 text-center text-[0.8rem] text-text-dim">Preview truncated — the download has everything.</p>}
    </div>
  )
}

function ZipPreview({ blob }) {
  const [entries, setEntries] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(blob)
      const list = Object.values(zip.files).filter((f) => !f.dir)
      if (!cancelled) setEntries(list.map((f) => f.name))
    })().catch(() => !cancelled && setEntries([]))
    return () => {
      cancelled = true
    }
  }, [blob])
  if (!entries) return <Spinner />
  return (
    <ul className="divide-y divide-[var(--border)] rounded-2xl bg-panel-raised">
      {entries.map((n) => (
        <li key={n} className="flex items-center gap-2 px-4 py-2.5 text-sm">
          <FileArchive className="h-4 w-4 flex-shrink-0 text-signal" /> {n}
        </li>
      ))}
    </ul>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-dim">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
    </div>
  )
}

export default function PreviewModal() {
  const { current, close } = usePreview()
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!current) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [current, close])

  const kind = current ? kindOf(current.blob, current.name) : null

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key="preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${current.name}`}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-panel shadow-lift sm:rounded-[28px]"
          >
            <div className="flex flex-shrink-0 items-center gap-3 px-5 py-4 sm:px-6">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-signal-dim text-signal">
                <Eye className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold">{current.name}</p>
                <p className="text-[0.75rem] text-text-dim">{formatBytes(current.blob.size)}</p>
              </div>
              <button
                ref={closeRef}
                onClick={close}
                aria-label="Close preview"
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-panel-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">
              {kind === 'image' && <ImagePreview blob={current.blob} />}
              {kind === 'pdf' && <PdfPreview blob={current.blob} />}
              {kind === 'docx' && <DocxPreview blob={current.blob} />}
              {kind === 'text' && <TextPreview blob={current.blob} />}
              {kind === 'zip' && <ZipPreview blob={current.blob} />}
              {kind === 'unknown' && <p className="py-10 text-center text-sm text-text-dim">No preview for this file type.</p>}
            </div>

            {current.onDownload && (
              <div className="flex flex-shrink-0 justify-end gap-2 bg-panel px-5 py-4 shadow-[0_-12px_24px_-16px_rgba(16,24,40,0.2)] sm:px-6">
                <button onClick={close} className="rounded-full bg-panel-raised px-5 py-2.5 text-sm font-medium">
                  Close
                </button>
                <button
                  onClick={() => {
                    current.onDownload()
                    close()
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--signal)] dark:text-void"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Small eye button for result rows. */
export function PreviewButton({ blob, name, onDownload }) {
  const { preview } = usePreview()
  return (
    <button
      onClick={() => preview({ blob, name, onDownload })}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-signal hover:bg-signal-dim"
      aria-label={`Preview ${name}`}
      title="Preview"
    >
      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  )
}
