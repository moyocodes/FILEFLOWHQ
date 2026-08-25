import { useState, useCallback, useMemo } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import FileRow from '../components/FileRow.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import {
  validateFiles,
  loadImage,
  canvasToBlob,
  downloadBlob,
  stripExtension,
  formatBytes,
  readAsArrayBuffer,
  uid
} from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

const TARGET_PRESETS = [
  { id: '500kb', label: '500 KB', bytes: 500 * 1024 },
  { id: '1mb', label: '1 MB', bytes: 1 * 1024 * 1024 },
  { id: '2mb', label: '2 MB', bytes: 2 * 1024 * 1024 }
]

const MAX_QUALITY = 0.92
const MIN_QUALITY = 0.05
const QUALITY_STEP = 0.1
const MAX_ATTEMPTS = 8

/**
 * Iteratively re-encodes a canvas at decreasing quality until the resulting
 * blob is under targetBytes (or we run out of attempts / quality range).
 * Returns the best-effort blob — never throws if the target can't be hit.
 */
async function compressToTargetSize(canvas, mimeType, targetBytes) {
  let quality = MAX_QUALITY
  let blob = await canvasToBlob(canvas, mimeType, quality)
  let attempts = 0
  while (blob.size > targetBytes && quality > MIN_QUALITY && attempts < MAX_ATTEMPTS) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP)
    blob = await canvasToBlob(canvas, mimeType, quality)
    attempts++
  }
  return { blob, quality }
}

const PDF_RENDER_SCALE = 2

/**
 * Compresses a PDF by rasterizing each page with pdfjs, re-encoding each
 * page image as JPEG at decreasing quality until the whole document lands
 * under targetBytes (best effort, budget split evenly per page), then
 * rebuilding a PDF with pdf-lib from the compressed page images. This trades
 * away any existing text layer / selectability for file size, same tradeoff
 * every browser-side "compress PDF" tool makes without a native encoder.
 */
async function compressPdf(file, targetBytes, onPageProgress) {
  const buffer = await readAsArrayBuffer(file)
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageBudget = targetBytes / pdf.numPages

  const outDoc = await PDFDocument.create()
  let hitTarget = true

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise

    const { blob } = await compressToTargetSize(canvas, 'image/jpeg', pageBudget)
    if (blob.size > pageBudget) hitTarget = false
    const jpgBytes = new Uint8Array(await blob.arrayBuffer())

    const pointViewport = page.getViewport({ scale: 1 })
    const embeddedImage = await outDoc.embedJpg(jpgBytes)
    const outPage = outDoc.addPage([pointViewport.width, pointViewport.height])
    outPage.drawImage(embeddedImage, { x: 0, y: 0, width: pointViewport.width, height: pointViewport.height })

    onPageProgress?.(i / pdf.numPages)
  }

  const bytes = await outDoc.save()
  return { blob: new Blob([bytes], { type: 'application/pdf' }), hitTarget }
}

/**
 * Tool "hook" for Image Compressor. Behavior change from the original
 * width/height-based resize tool: instead of max width/height inputs, the
 * user picks (or types) a target output size in MB/KB, and the tool
 * iteratively lowers JPEG/WebP quality until the result lands under that
 * target (best effort). PNG has no quality knob, so hitting a size target
 * with a PNG source auto-falls-back to JPEG output (communicated in the UI).
 */
export default function useImageCompressor() {
  const { gatedDownload } = useEmailGate()
  const [items, setItems] = useState([])
  const [targetPreset, setTargetPreset] = useState('1mb')
  const [customTargetKb, setCustomTargetKb] = useState('')
  const [keepFormat, setKeepFormat] = useState(true)
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const targetBytes = customTargetKb && Number(customTargetKb) > 0
    ? Math.round(Number(customTargetKb) * 1024)
    : TARGET_PRESETS.find((p) => p.id === targetPreset)?.bytes ?? 1024 * 1024

  const targetLabel = customTargetKb && Number(customTargetKb) > 0
    ? `${Number(customTargetKb)} KB`
    : TARGET_PRESETS.find((p) => p.id === targetPreset)?.label ?? '1 MB'

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['image/*', '.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    const newItems = valid.map((file) => {
      const isPdf = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name)
      return {
        id: uid(),
        file,
        isPdf,
        thumb: isPdf ? null : URL.createObjectURL(file),
        status: 'idle',
        resultBlob: null,
        resultName: null
      }
    })
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])

  const renameItem = useCallback((id, newName) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id || !i.resultName) return i
        const ext = i.resultName.includes('.') ? i.resultName.split('.').pop() : ''
        const base = newName.includes('.') ? newName.slice(0, newName.lastIndexOf('.')) : newName
        return { ...i, resultName: ext ? `${base}.${ext}` : base }
      })
    )
  }, [])

  const convertAll = useCallback(async () => {
    if (items.length === 0) return
    setIsConverting(true)
    setErrors([])
    let completed = 0
    const updated = [...items]
    const notes = []

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      try {
        if (item.isPdf) {
          const { blob, hitTarget } = await compressPdf(item.file, targetBytes, (frac) => {
            setProgress(((completed + frac) / updated.length) * 100)
          })
          if (!hitTarget) {
            notes.push(`"${item.file.name}" couldn't reach ${targetLabel} — smallest achievable size was used instead.`)
          }
          updated[i] = {
            ...item,
            status: 'done',
            resultBlob: blob,
            resultName: `${stripExtension(item.file.name)}-compressed.pdf`
          }
        } else {
          const { img, url } = await loadImage(item.file)
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')

          const originalIsPng = /png/i.test(item.file.type)
          // PNG is lossless (no quality knob) — to hit a size target we need to
          // encode as JPEG instead, regardless of "keep original format".
          const mime = keepFormat && !originalIsPng ? item.file.type || 'image/jpeg' : 'image/jpeg'
          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          ctx.drawImage(img, 0, 0)

          const { blob } = await compressToTargetSize(canvas, mime, targetBytes)
          URL.revokeObjectURL(url)

          if (originalIsPng && keepFormat) {
            notes.push(`"${item.file.name}" was PNG (lossless) — converted to JPEG to hit the size target.`)
          }
          if (blob.size > targetBytes) {
            notes.push(`"${item.file.name}" couldn't reach ${targetLabel} — smallest achievable size was used instead.`)
          }

          const ext = mime === 'image/webp' ? 'webp' : 'jpg'
          updated[i] = {
            ...item,
            status: 'done',
            resultBlob: blob,
            resultName: `${stripExtension(item.file.name)}-compressed.${ext}`
          }
        }
      } catch (err) {
        notes.push(err.message)
      }
      completed += 1
      setProgress((completed / updated.length) * 100)
      setItems([...updated])
    }
    if (notes.length > 0) setErrors(notes)
    setIsConverting(false)
  }, [items, keepFormat, targetBytes, targetLabel])

  const anyDone = items.some((i) => i.status === 'done')
  const doneCount = items.filter((i) => i.status === 'done').length
  const allDone = items.length > 0 && doneCount === items.length
  const downloadAll = useCallback(() => {
    const ready = items.filter((i) => i.resultBlob)
    if (ready.length === 0) return
    gatedDownload(
      () => ready.forEach((i) => downloadBlob(i.resultBlob, i.resultName)),
      ready.length === 1 ? ready[0].resultName : `${ready.length} files`,
      'Image & PDF Compressor'
    )
  }, [items, gatedDownload])
  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Pick a target output size and FileFlowHQ finds a quality level that gets each image or PDF under it.
      </p>

      <Dropzone accept="image/*,.pdf,application/pdf" multiple onFiles={handleFiles} hint="PNG, JPG, WebP, PDF" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {isConverting && <ProgressBar label="Compressing…" progress={progress} />}

      {items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <FileRow
                key={item.id}
                name={item.resultName || item.file.name}
                size={item.resultBlob ? item.resultBlob.size : item.file.size}
                thumbnail={item.isPdf ? undefined : item.thumb}
                status={item.status}
                onRemove={() => removeItem(item.id)}
                onRename={item.resultName ? (newName) => renameItem(item.id, newName) : undefined}
                rightSlot={
                  <div className="flex items-center gap-2">
                    {item.status === 'done' && (
                      <span className="hidden font-mono text-xs text-text-dim sm:inline">
                        {formatBytes(item.file.size)} → {formatBytes(item.resultBlob.size)}
                      </span>
                    )}
                    {item.status === 'done' && (
                      <button
                        onClick={() =>
                          gatedDownload(
                            () => downloadBlob(item.resultBlob, item.resultName),
                            item.resultName,
                            'Image & PDF Compressor'
                          )
                        }
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-signal hover:bg-signal-dim"
                        aria-label={`Download ${item.resultName}`}
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </div>

          {anyDone && !allDone && (
            <button onClick={downloadAll} className="text-sm font-medium text-signal hover:underline">
              Download {doneCount > 1 ? 'all' : ''} compressed {doneCount === 1 ? 'file' : 'files'}
            </button>
          )}
        </>
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, isConverting, progress, items, removeItem, renameItem, anyDone, allDone, doneCount, downloadAll, gatedDownload]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Target size
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TARGET_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setTargetPreset(p.id)
                setCustomTargetKb('')
              }}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                targetPreset === p.id && !customTargetKb
                  ? 'bg-signal text-void'
                  : 'bg-panel-raised text-text-dim hover:text-text'
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2.5">
          <label className="mb-1 block text-xs text-text-dim">Or enter a custom size (KB)</label>
          <input
            type="number"
            min="10"
            step="10"
            value={customTargetKb}
            onChange={(e) => setCustomTargetKb(e.target.value)}
            placeholder="e.g. 500"
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <p className="mt-2 text-xs text-text-dim">
          Quality is reduced iteratively until the output lands under {targetLabel} (best effort).
        </p>
      </div>

      {items.some((i) => !i.isPdf) && (
        <label className="field flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keepFormat} onChange={(e) => setKeepFormat(e.target.checked)} className="accent-signal" />
          <span>
            Keep original format
            <span className="mt-0.5 block text-xs font-normal text-text-dim">
              JPEGs and WebPs stay as-is. PNGs are always converted to JPEG, since PNG has no quality setting to shrink
              it with.
            </span>
          </span>
        </label>
      )}

      {items.some((i) => i.isPdf) && (
        <p className="field text-xs text-text-dim">
          PDF pages are rendered as images and recompressed, so any selectable text becomes part of the image.
        </p>
      )}

      <button
        onClick={allDone ? downloadAll : convertAll}
        disabled={isConverting || items.length === 0}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {allDone
          ? `Download ${doneCount > 1 ? `all ${doneCount} files` : 'compressed file'}`
          : `Compress ${items.length || ''} ${items.length === 1 ? 'file' : 'files'}`}
      </button>
    </>
    ),
    [targetPreset, customTargetKb, targetLabel, keepFormat, convertAll, isConverting, items, allDone, doneCount, downloadAll]
  )

  return { workspace, settings }
}
