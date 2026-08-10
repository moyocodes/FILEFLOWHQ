import { useState, useCallback, useMemo } from 'react'
import { Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import FileRow from '../components/FileRow.jsx'
import { validateFiles, loadImage, canvasToBlob, downloadBlob, stripExtension, uid, isTiff, decodeTiffToCanvas } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

const FORMATS = [
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'jpg', label: 'JPEG', mime: 'image/jpeg' },
  { id: 'webp', label: 'WebP', mime: 'image/webp' }
]

/**
 * Tool "hook": owns all state/handlers for Image Converter and returns
 * { workspace, settings } JSX sharing this closure. ToolPage calls this as
 * a component-body hook and routes the two pieces into the center/right panes.
 *
 * `workspace`/`settings` are memoized (and their handlers wrapped in
 * useCallback) because ToolPage pushes `settings` into a context on every
 * change — a fresh JSX object every render would re-trigger that effect
 * every render and loop forever, so identity must stay stable unless the
 * underlying state actually changed.
 */
export default function useImageConverter() {
  const { gatedDownload } = useEmailGate()
  const [items, setItems] = useState([]) // { id, file, thumb, status, resultBlob, resultName }
  const [targetFormat, setTargetFormat] = useState('webp')
  const [quality, setQuality] = useState(0.9)
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, {
      // TIFF often has an empty/`image/tiff` MIME that `image/*` may miss, so accept by extension too.
      accept: ['image/*', '.tif', '.tiff']
    })
    setErrors(fileErrors)
    const newItems = valid.map((file) => ({
      id: uid(),
      file,
      thumb: isTiff(file) ? null : URL.createObjectURL(file), // browsers can't preview TIFF
      status: 'idle',
      resultBlob: null,
      resultName: null
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])

  const renameItem = useCallback((id, newName) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id || !i.results || i.results.length === 0) return i
        const base = newName.includes('.') ? newName.slice(0, newName.lastIndexOf('.')) : newName
        // Rename applies to the item's base name; multi-page keeps its -N page suffixes.
        const multi = i.results.length > 1
        const results = i.results.map((r, idx) => {
          const ext = r.name.includes('.') ? r.name.split('.').pop() : ''
          const suffix = multi ? `-${idx + 1}` : ''
          return { ...r, name: ext ? `${base}${suffix}.${ext}` : `${base}${suffix}` }
        })
        return { ...i, results }
      })
    )
  }, [])

  const convertAll = useCallback(async () => {
    if (items.length === 0) return
    setIsConverting(true)
    setErrors([])
    const format = FORMATS.find((f) => f.id === targetFormat)
    let completed = 0

    const encodeCanvas = async (source, baseName, pageSuffix) => {
      const canvas = document.createElement('canvas')
      canvas.width = source.naturalWidth ?? source.width
      canvas.height = source.naturalHeight ?? source.height
      const ctx = canvas.getContext('2d')
      // Flatten transparency onto white when converting to JPG (no alpha channel)
      if (format.id === 'jpg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(source, 0, 0)
      const blob = await canvasToBlob(canvas, format.mime, format.id === 'png' ? undefined : quality)
      return { blob, name: `${baseName}${pageSuffix}.${format.id}` }
    }

    const updated = [...items]
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      const baseName = stripExtension(item.file.name)
      try {
        const results = []
        if (isTiff(item.file)) {
          // TIFF can't go through <img>; decode to one canvas per page, and a
          // multi-page TIFF becomes one output file per page (name-1, name-2…).
          const canvases = await decodeTiffToCanvas(item.file)
          const multi = canvases.length > 1
          for (let p = 0; p < canvases.length; p++) {
            results.push(await encodeCanvas(canvases[p], baseName, multi ? `-${p + 1}` : ''))
          }
        } else {
          const { img, url } = await loadImage(item.file)
          results.push(await encodeCanvas(img, baseName, ''))
          URL.revokeObjectURL(url)
        }

        updated[i] = { ...item, status: 'done', results }
      } catch (err) {
        updated[i] = { ...item, status: 'error' }
        setErrors((prev) => [...prev, err.message])
      }
      completed += 1
      setProgress((completed / updated.length) * 100)
      setItems([...updated])
    }

    setIsConverting(false)
  }, [items, targetFormat, quality])

  const downloadOne = useCallback(
    (item) => {
      const results = item.results || []
      if (results.length === 0) return
      gatedDownload(
        () => results.forEach((r) => downloadBlob(r.blob, r.name)),
        results.length === 1 ? results[0].name : `${results.length} files`,
        'Image Converter'
      )
    },
    [gatedDownload]
  )

  const downloadAll = useCallback(() => {
    const all = items.flatMap((item) => item.results || [])
    if (all.length === 0) return
    gatedDownload(
      () => all.forEach((r) => downloadBlob(r.blob, r.name)),
      all.length === 1 ? all[0].name : `${all.length} files`,
      'Image Converter'
    )
  }, [items, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const anyDone = items.some((i) => i.status === 'done')

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Convert PNG, JPG, WebP, GIF, BMP, and TIFF images to PNG, JPG, or WebP.
          Multi-page TIFFs are split into one image per page. Everything happens on
          your device — no upload.
        </p>

        <Dropzone accept="image/*,.tif,.tiff" multiple onFiles={handleFiles} hint="PNG, JPEG, WebP, GIF, BMP, TIFF" />

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {isConverting && <ProgressBar label="Converting images…" progress={progress} />}

        {items.length > 0 && (
          <>
            <div className="space-y-2">
              {items.map((item) => {
                const primary = item.results && item.results[0]
                const pageCount = item.results ? item.results.length : 0
                const displayName = primary ? primary.name : item.file.name
                const displaySize = primary
                  ? item.results.reduce((sum, r) => sum + r.blob.size, 0)
                  : item.file.size
                return (
                  <FileRow
                    key={item.id}
                    name={pageCount > 1 ? `${displayName} (+${pageCount - 1} more)` : displayName}
                    size={displaySize}
                    thumbnail={item.thumb}
                    status={item.status}
                    onRemove={() => removeItem(item.id)}
                    onRename={primary ? (newName) => renameItem(item.id, newName) : undefined}
                    rightSlot={
                      item.status === 'done' ? (
                        <button
                          onClick={() => downloadOne(item)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-signal hover:bg-signal-dim"
                          aria-label={`Download ${displayName}`}
                        >
                          <Download className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      ) : null
                    }
                  />
                )
              })}
            </div>

            {anyDone && (
              <button onClick={downloadAll} className="text-sm font-medium text-signal hover:underline">
                Download all converted files
              </button>
            )}
          </>
        )}
      </div>
    ),
    [items, errors, isConverting, progress, anyDone, handleFiles, removeItem, renameItem, downloadOne, downloadAll, clearErrors]
  )

  const settings = useMemo(
    () => (
      <>
        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            Convert to
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTargetFormat(f.id)}
                className={[
                  'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  targetFormat === f.id ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim hover:text-text'
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {targetFormat !== 'png' && (
          <div className="field">
            <label className="mb-2.5 flex justify-between font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
              <span>Quality</span>
              <span className="text-signal normal-case">{Math.round(quality * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-signal"
            />
          </div>
        )}

        <button
          onClick={convertAll}
          disabled={isConverting || items.length === 0}
          className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Convert {items.length || ''} {items.length === 1 ? 'image' : 'images'}
        </button>
      </>
    ),
    [targetFormat, quality, isConverting, items.length, convertAll]
  )

  return { workspace, settings }
}
