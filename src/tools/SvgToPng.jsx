import { useState, useCallback, useMemo, useEffect } from 'react'
import { Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import FileRow from '../components/FileRow.jsx'
import { validateFiles, readAsText, canvasToBlob, downloadBlob, stripExtension, uid, checkAvifSupport } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

const SCALES = [1, 2, 3, 4]
const FORMATS = [
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'webp', label: 'WebP', mime: 'image/webp' },
  { id: 'avif', label: 'AVIF', mime: 'image/avif' }
]
const BACKGROUNDS = [
  { id: 'transparent', label: 'Transparent' },
  { id: 'white', label: 'White' },
  { id: 'custom', label: 'Custom' }
]

// iOS Safari refuses canvases above ~16.7M pixels (and returns a blank
// image rather than throwing), so cap the output area to stay under it.
const MAX_PIXELS = 16_000_000
const FALLBACK_SIZE = { width: 300, height: 150 } // the browser default for unsized SVG

/** Parse "120", "120px", "120.5" → number; percentages and other units → null. */
function parseLength(value) {
  if (!value) return null
  const m = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(value)
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Work out the SVG's intrinsic size from width/height, falling back to the
 * viewBox (keeping its aspect ratio), then to the browser's 300×150 default.
 */
function intrinsicSize(svgEl) {
  const w = parseLength(svgEl.getAttribute('width'))
  const h = parseLength(svgEl.getAttribute('height'))
  const vb = (svgEl.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  const hasViewBox = vb.length === 4 && vb[2] > 0 && vb[3] > 0
  const ratio = hasViewBox ? vb[2] / vb[3] : null

  if (w && h) return { width: w, height: h }
  if (w && ratio) return { width: w, height: w / ratio }
  if (h && ratio) return { width: h * ratio, height: h }
  if (hasViewBox) return { width: vb[2], height: vb[3] }
  return FALLBACK_SIZE
}

/**
 * Render an SVG file to a PNG (or WebP/AVIF) Blob. The SVG is re-serialized with explicit
 * width/height at the output size, so the browser rasterizes the vectors at
 * full resolution instead of drawing at 1× and upscaling (which blurs).
 */
async function svgToPng(file, { scale, width: customWidth, background, mime }) {
  const text = await readAsText(file)
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svgEl = doc.documentElement
  if (doc.querySelector('parsererror') || svgEl.nodeName.toLowerCase() !== 'svg') {
    throw new Error(`"${file.name}" isn't a valid SVG file.`)
  }

  const base = intrinsicSize(svgEl)
  let outW = customWidth ? customWidth : base.width * scale
  let outH = customWidth ? (customWidth / base.width) * base.height : base.height * scale
  if (outW * outH > MAX_PIXELS) {
    const shrink = Math.sqrt(MAX_PIXELS / (outW * outH))
    outW *= shrink
    outH *= shrink
  }
  outW = Math.max(1, Math.round(outW))
  outH = Math.max(1, Math.round(outH))

  // Keep the original coordinate system when we override width/height.
  if (!svgEl.getAttribute('viewBox')) {
    svgEl.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`)
  }
  svgEl.setAttribute('width', String(outW))
  svgEl.setAttribute('height', String(outH))
  if (!svgEl.getAttribute('xmlns')) svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not render "${file.name}". The SVG may be malformed.`))
      el.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, outW, outH)
    }
    ctx.drawImage(img, 0, 0, outW, outH)
    const out = await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : 0.92)
    return { blob: out, width: outW, height: outH }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Tool hook for SVG → PNG/WebP/AVIF; see ImageConverter.jsx for the { workspace, settings } pattern. */
export default function useSvgToPng() {
  const { gatedDownload } = useEmailGate()
  const [items, setItems] = useState([]) // { id, file, thumb, status, result: { blob, name, width, height } }
  const [scale, setScale] = useState(2)
  const [customWidth, setCustomWidth] = useState('')
  const [bgMode, setBgMode] = useState('transparent')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [format, setFormat] = useState('png')
  const [avifSupported, setAvifSupported] = useState(true)

  useEffect(() => {
    checkAvifSupport().then(setAvifSupported)
  }, [])
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.svg', 'image/svg+xml'] })
    setErrors(fileErrors)
    setItems((prev) => [
      ...prev,
      ...valid.map((file) => ({ id: uid(), file, thumb: URL.createObjectURL(file), status: 'idle', result: null }))
    ])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])

  const renameItem = useCallback((id, newName) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id || !i.result) return i
        const ext = i.result.name.split('.').pop()
        const base = newName.toLowerCase().endsWith(`.${ext}`) ? newName.slice(0, -(ext.length + 1)) : newName
        return { ...i, result: { ...i.result, name: `${base}.${ext}` } }
      })
    )
  }, [])

  const convertAll = useCallback(async () => {
    if (items.length === 0) return
    const widthNum = Number(customWidth)
    if (customWidth && !(Number.isFinite(widthNum) && widthNum >= 1 && widthNum <= 16000)) {
      setErrors(['Custom width must be a number between 1 and 16000 pixels.'])
      return
    }
    if (format === 'avif' && !(await checkAvifSupport())) {
      setErrors(['AVIF export isn’t supported in this browser. Try Chrome or Edge, or pick PNG or WebP.'])
      return
    }
    const fmt = FORMATS.find((f) => f.id === format)
    setIsConverting(true)
    setErrors([])
    setProgress(0)
    const background = bgMode === 'white' ? '#ffffff' : bgMode === 'custom' ? bgColor : null

    const updated = [...items]
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      try {
        const { blob, width, height } = await svgToPng(item.file, {
          scale,
          width: customWidth ? widthNum : null,
          background,
          mime: fmt.mime
        })
        updated[i] = {
          ...item,
          status: 'done',
          result: { blob, width, height, name: `${stripExtension(item.file.name)}.${fmt.id}` }
        }
      } catch (err) {
        updated[i] = { ...item, status: 'error' }
        setErrors((prev) => [...prev, err.message])
      }
      setProgress(((i + 1) / updated.length) * 100)
      setItems([...updated])
    }
    setIsConverting(false)
  }, [items, scale, customWidth, bgMode, bgColor, format])

  const downloadOne = useCallback(
    (item) => {
      if (!item.result) return
      gatedDownload(() => downloadBlob(item.result.blob, item.result.name), item.result.name, 'SVG to PNG')
    },
    [gatedDownload]
  )

  const downloadAll = useCallback(() => {
    const done = items.filter((i) => i.result)
    if (done.length === 0) return
    gatedDownload(
      () => done.forEach((i) => downloadBlob(i.result.blob, i.result.name)),
      done.length === 1 ? done[0].result.name : `${done.length} files`,
      'SVG to PNG'
    )
  }, [items, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  // Changing output settings invalidates finished results, so reset them.
  const resetResults = useCallback(
    () => setItems((prev) => prev.map((i) => (i.status === 'done' ? { ...i, status: 'idle', result: null } : i))),
    []
  )

  const doneCount = items.filter((i) => i.status === 'done').length
  const allDone = items.length > 0 && doneCount === items.length

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Turn SVG vector graphics into sharp PNG, WebP, or AVIF images at any size. Rendering happens on your
          device — nothing is uploaded.
        </p>

        <Dropzone accept=".svg,image/svg+xml" multiple onFiles={handleFiles} hint="SVG" />

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {isConverting && <ProgressBar label="Rendering SVGs…" progress={progress} />}

        {items.length > 0 && (
          <>
            <div className="space-y-2">
              {items.map((item) => {
                const r = item.result
                const name = r ? `${r.name} · ${r.width}×${r.height}` : item.file.name
                return (
                  <FileRow
                    key={item.id}
                    name={name}
                    size={r ? r.blob.size : item.file.size}
                    thumbnail={item.thumb}
                    status={item.status}
                    onRemove={() => removeItem(item.id)}
                    onRename={r ? (newName) => renameItem(item.id, newName) : undefined}
                    rightSlot={
                      r ? (
                        <button
                          onClick={() => downloadOne(item)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-signal hover:bg-signal-dim"
                          aria-label={`Download ${r.name}`}
                        >
                          <Download className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      ) : null
                    }
                  />
                )
              })}
            </div>

            {doneCount > 1 && (
              <button onClick={downloadAll} className="text-sm font-medium text-signal hover:underline">
                Download all files
              </button>
            )}
          </>
        )}
      </div>
    ),
    [items, errors, isConverting, progress, doneCount, handleFiles, removeItem, renameItem, downloadOne, downloadAll, clearErrors]
  )

  const labelClass = 'mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim'
  const chip = (active) =>
    [
      'rounded px-3 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim hover:text-text'
    ].join(' ')

  const settings = useMemo(
    () => (
      <>
        <div className="field">
          <label className={labelClass}>Output format</label>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => {
              const disabled = f.id === 'avif' && !avifSupported
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormat(f.id)
                    resetResults()
                  }}
                  disabled={disabled}
                  title={disabled ? 'AVIF export needs Chrome or Edge' : undefined}
                  className={disabled ? 'cursor-not-allowed rounded bg-panel-raised px-3 py-1.5 text-sm font-medium text-text-dim opacity-40' : chip(format === f.id)}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label className={labelClass}>Scale</label>
          <div className="flex flex-wrap gap-1.5">
            {SCALES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScale(s)
                  setCustomWidth('')
                  resetResults()
                }}
                className={chip(!customWidth && scale === s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="svg-width" className={labelClass}>
            Or exact width (px)
          </label>
          <input
            id="svg-width"
            type="number"
            min="1"
            max="16000"
            placeholder="e.g. 1024"
            value={customWidth}
            onChange={(e) => {
              setCustomWidth(e.target.value)
              resetResults()
            }}
            className="w-full rounded border border-border bg-panel-raised px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-signal focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-dim">Height follows the SVG's aspect ratio.</p>
        </div>

        <div className="field">
          <label className={labelClass}>Background</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBgMode(b.id)
                  resetResults()
                }}
                className={chip(bgMode === b.id)}
              >
                {b.label}
              </button>
            ))}
            {bgMode === 'custom' && (
              <input
                type="color"
                value={bgColor}
                onChange={(e) => {
                  setBgColor(e.target.value)
                  resetResults()
                }}
                aria-label="Background color"
                className="h-8 w-10 cursor-pointer rounded border border-border bg-panel-raised"
              />
            )}
          </div>
        </div>

        <button
          onClick={allDone ? downloadAll : convertAll}
          disabled={isConverting || items.length === 0}
          className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {allDone
            ? `Download ${doneCount > 1 ? `all ${doneCount} files` : 'file'}`
            : `Convert ${items.length || ''} ${items.length === 1 ? 'SVG' : 'SVGs'}`}
        </button>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [format, avifSupported, scale, customWidth, bgMode, bgColor, isConverting, items.length, allDone, doneCount, convertAll, downloadAll, resetResults]
  )

  return { workspace, settings }
}
