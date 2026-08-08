import { useState, useCallback, useMemo } from 'react'
import { Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import FileRow from '../components/FileRow.jsx'
import { validateFiles, loadImage, canvasToBlob, downloadBlob, stripExtension, formatBytes, uid } from '../utils/fileHelpers.js'
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
  const [customTargetMb, setCustomTargetMb] = useState('')
  const [keepFormat, setKeepFormat] = useState(true)
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const targetBytes = customTargetMb && Number(customTargetMb) > 0
    ? Math.round(Number(customTargetMb) * 1024 * 1024)
    : TARGET_PRESETS.find((p) => p.id === targetPreset)?.bytes ?? 1024 * 1024

  const targetLabel = customTargetMb && Number(customTargetMb) > 0
    ? `${Number(customTargetMb)} MB`
    : TARGET_PRESETS.find((p) => p.id === targetPreset)?.label ?? '1 MB'

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['image/*'] })
    setErrors(fileErrors)
    const newItems = valid.map((file) => ({
      id: uid(),
      file,
      thumb: URL.createObjectURL(file),
      status: 'idle',
      resultBlob: null,
      resultName: null
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])

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
  const downloadAll = useCallback(() => {
    const ready = items.filter((i) => i.resultBlob)
    if (ready.length === 0) return
    gatedDownload(
      () => ready.forEach((i) => downloadBlob(i.resultBlob, i.resultName)),
      ready.length === 1 ? ready[0].resultName : `${ready.length} files`
    )
  }, [items, gatedDownload])
  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Pick a target output size and FileFlowHQ finds a JPEG/WebP quality level that gets each image under it.
      </p>

      <Dropzone accept="image/*" multiple onFiles={handleFiles} hint="PNG, JPG, WebP" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {isConverting && <ProgressBar label="Compressing images…" progress={progress} />}

      {items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <FileRow
                key={item.id}
                name={item.resultName || item.file.name}
                size={item.resultBlob ? item.resultBlob.size : item.file.size}
                thumbnail={item.thumb}
                status={item.status}
                onRemove={() => removeItem(item.id)}
                rightSlot={
                  <div className="flex items-center gap-2">
                    {item.status === 'done' && (
                      <span className="hidden font-mono text-xs text-text-dim sm:inline">
                        {formatBytes(item.file.size)} → {formatBytes(item.resultBlob.size)}
                      </span>
                    )}
                    {item.status === 'done' && (
                      <button
                        onClick={() => gatedDownload(() => downloadBlob(item.resultBlob, item.resultName), item.resultName)}
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

          {anyDone && (
            <button onClick={downloadAll} className="text-sm font-medium text-signal hover:underline">
              Download all compressed files
            </button>
          )}
        </>
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, isConverting, progress, items, removeItem, anyDone, downloadAll, gatedDownload]
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
                setCustomTargetMb('')
              }}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                targetPreset === p.id && !customTargetMb
                  ? 'bg-signal text-void'
                  : 'bg-panel-raised text-text-dim hover:text-text'
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2.5">
          <label className="mb-1 block text-xs text-text-dim">Or enter a custom size (MB)</label>
          <input
            type="number"
            min="0.05"
            step="0.1"
            value={customTargetMb}
            onChange={(e) => setCustomTargetMb(e.target.value)}
            placeholder="e.g. 1.5"
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <p className="mt-2 text-xs text-text-dim">
          Quality is reduced iteratively until the output lands under {targetLabel} (best effort).
        </p>
      </div>

      <label className="field flex items-center gap-2 text-sm">
        <input type="checkbox" checked={keepFormat} onChange={(e) => setKeepFormat(e.target.checked)} className="accent-signal" />
        <span>
          Keep original format
          <span className="mt-0.5 block text-xs font-normal text-text-dim">
            PNG can't be size-targeted losslessly — PNGs always convert to JPEG to hit a target.
          </span>
        </span>
      </label>

      <button
        onClick={convertAll}
        disabled={isConverting || items.length === 0}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Compress {items.length || ''} {items.length === 1 ? 'image' : 'images'}
      </button>
    </>
    ),
    [targetPreset, customTargetMb, targetLabel, keepFormat, convertAll, isConverting, items.length]
  )

  return { workspace, settings }
}
