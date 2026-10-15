import { useState, useCallback, useMemo, useEffect } from 'react'
import { Download, Cpu } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import { PreviewButton } from '../components/PreviewModal.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import FileRow from '../components/FileRow.jsx'
import { validateFiles, canvasToBlob, downloadBlob, stripExtension, uid, checkAvifSupport, releaseCanvas, canvasFitScale } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'
import { runEngine, enginesSupported, ENGINES } from '../utils/engines.js'

// Every format is written by the Studio image engine (photocraft's codecs), except AVIF: the
// engine decodes, and the browser's own AVIF encoder writes it.
const FORMATS = [
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'jpg', label: 'JPEG', mime: 'image/jpeg', lossy: true },
  { id: 'webp', label: 'WebP', mime: 'image/webp', lossy: true },
  { id: 'avif', label: 'AVIF', mime: 'image/avif', lossy: true },
  { id: 'tiff', label: 'TIFF', mime: 'image/tiff' },
  { id: 'psd', label: 'PSD', mime: 'image/vnd.adobe.photoshop' },
  { id: 'gif', label: 'GIF', mime: 'image/gif' },
  { id: 'bmp', label: 'BMP', mime: 'image/bmp' }
]

// What the engine opens: everyday formats, iPhone photos, camera RAW, Photoshop and HDR files.
const INPUT_EXTS = [
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'hif', 'avif', 'psd', 'psb', 'tga', 'ico', 'qoi', 'exr', 'hdr',
  'svg', 'dng', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'pef', 'orf', 'rw2', 'raf', 'ora', 'pcx', 'pbm', 'pgm', 'ppm'
]
const ACCEPT = ['image/*', ...INPUT_EXTS.map((e) => `.${e}`)]
// Only these get a thumbnail: the rest (HEIC, RAW, PSD, TIFF…) browsers can't show.
const BROWSER_PREVIEWABLE = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico'])
const extOf = (name) => name.split('.').pop()?.toLowerCase() || ''

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
  const [stripMetadata, setStripMetadata] = useState(false)
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [avifSupported, setAvifSupported] = useState(true)

  useEffect(() => {
    checkAvifSupport().then(setAvifSupported)
  }, [])

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, {
      // RAW, PSD, TIFF and HEIC often have an empty MIME that `image/*` misses: accept by extension too.
      accept: ACCEPT
    })
    setErrors(fileErrors)
    const newItems = valid.map((file) => ({
      id: uid(),
      file,
      thumb: BROWSER_PREVIEWABLE.has(extOf(file.name)) ? URL.createObjectURL(file) : null,
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
    if (!enginesSupported) {
      setErrors(['Image conversion needs a current browser (WebAssembly).'])
      return
    }
    if (targetFormat === 'avif' && !(await checkAvifSupport())) {
      setErrors(['AVIF export isn’t supported in this browser. Try Chrome or Edge, or pick a different format.'])
      return
    }
    setIsConverting(true)
    setErrors([])
    setStatus(`Loading the Studio image engine (${ENGINES.image.size}, first time only)…`)
    const format = FORMATS.find((f) => f.id === targetFormat)
    const q = format.lossy ? Math.round(quality * 100) : 0
    let completed = 0

    // The browser writes AVIF: the engine hands it lossless PNG pixels.
    const encodeAvif = async (png) => {
      const bitmap = await createImageBitmap(new Blob([png], { type: 'image/png' }))
      const fit = canvasFitScale(bitmap.width, bitmap.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * fit)
      canvas.height = Math.round(bitmap.height * fit)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      return canvasToBlob(canvas, format.mime, quality).finally(() => releaseCanvas(canvas))
    }

    const updated = [...items]
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      try {
        const input = new Uint8Array(await item.file.arrayBuffer())
        const bytes = await runEngine('image', 'convert', input, item.file.name, format.id === 'avif' ? 'png' : format.id, q, stripMetadata)
        setStatus('Converting with the Studio image engine…')
        const blob = format.id === 'avif' ? await encodeAvif(bytes) : new Blob([bytes], { type: format.mime })
        updated[i] = { ...item, status: 'done', results: [{ blob, name: `${stripExtension(item.file.name)}.${format.id}` }] }
      } catch (err) {
        updated[i] = { ...item, status: 'error' }
        setErrors((prev) => [...prev, `${item.file.name}: ${err.message}`])
      }
      completed += 1
      setProgress((completed / updated.length) * 100)
      setItems([...updated])
    }

    setIsConverting(false)
  }, [items, targetFormat, quality, stripMetadata])

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

  const doneCount = items.filter((i) => i.status === 'done').length
  const allDone = items.length > 0 && doneCount === items.length
  const sameFormatExt = targetFormat === 'jpg' ? ['jpg', 'jpeg'] : [targetFormat]
  const allAlreadyTarget =
    items.length > 0 &&
    items.every((i) => sameFormatExt.includes(i.file.name.split('.').pop()?.toLowerCase()))

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Convert any image, including iPhone HEIC photos, camera RAW, Photoshop PSD, TIFF and HDR, to PNG, JPEG, WebP,
          AVIF, TIFF, PSD, GIF or BMP. Everything happens on your device — no upload.
        </p>

        <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
          <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <p>
            <strong>Powered by the Studio image engine.</strong> The same file readers and encoders as our Photo
            Editor, running on your device. It downloads once ({ENGINES.image.size}).
          </p>
        </div>

        <Dropzone accept={ACCEPT.join(',')} multiple onFiles={handleFiles} hint="JPEG, PNG, WebP, HEIC, RAW (DNG, CR2, NEF, ARW…), PSD, TIFF, AVIF, GIF, BMP, EXR" />

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {allAlreadyTarget && !isConverting && doneCount === 0 && (
          <p className="text-xs text-text-dim">
            Already {FORMATS.find((f) => f.id === targetFormat)?.label} — converting will just re-encode (useful
            for changing quality/size), or pick a different format above.
          </p>
        )}

        {isConverting && <ProgressBar label={status} progress={progress} />}

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
                        <>
                          <PreviewButton blob={primary.blob} name={primary.name} onDownload={() => downloadOne(item)} />
                          <button
                            onClick={() => downloadOne(item)}
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-signal hover:bg-signal-dim"
                            aria-label={`Download ${displayName}`}
                          >
                            <Download className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </>
                      ) : null
                    }
                  />
                )
              })}
            </div>

            {doneCount > 1 && (
              <button onClick={downloadAll} className="text-sm font-normal text-signal hover:underline">
                Download all converted files
              </button>
            )}
          </>
        )}
      </div>
    ),
    [
      items,
      errors,
      isConverting,
      progress,
      status,
      doneCount,
      allAlreadyTarget,
      targetFormat,
      handleFiles,
      removeItem,
      renameItem,
      downloadOne,
      downloadAll,
      clearErrors
    ]
  )

  const settings = useMemo(
    () => (
      <>
        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            Convert to
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => {
              const disabled = f.id === 'avif' && !avifSupported
              return (
                <button
                  key={f.id}
                  onClick={() => setTargetFormat(f.id)}
                  disabled={disabled}
                  title={disabled ? 'AVIF export needs Chrome or Edge' : undefined}
                  className={[
                    'rounded px-3 py-1.5 text-sm font-normal transition-colors',
                    disabled
                      ? 'cursor-not-allowed bg-panel-raised text-text-dim opacity-40'
                      : targetFormat === f.id
                        ? 'bg-signal text-void'
                        : 'bg-panel-raised text-text-dim hover:text-text'
                  ].join(' ')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {FORMATS.find((f) => f.id === targetFormat)?.lossy && (
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

        <label className="field flex cursor-pointer items-center gap-2.5 text-sm text-text-dim">
          <input type="checkbox" checked={stripMetadata} onChange={(e) => setStripMetadata(e.target.checked)} className="accent-signal" />
          Remove camera and location data
        </label>

        <button
          onClick={allDone ? downloadAll : convertAll}
          disabled={isConverting || items.length === 0}
          className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {allDone
            ? `Download ${doneCount > 1 ? `all ${doneCount} files` : 'converted file'}`
            : `Convert ${items.length || ''} ${items.length === 1 ? 'image' : 'images'}`}
        </button>
      </>
    ),
    [targetFormat, quality, stripMetadata, isConverting, items.length, convertAll, allDone, doneCount, downloadAll, avifSupported]
  )

  return { workspace, settings }
}
