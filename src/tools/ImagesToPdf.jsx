import { useState, useCallback, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { GripVertical, Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { validateFiles, loadImage, downloadBlob, formatBytes, uid } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

export default function useImagesToPdf() {
  const { gatedDownload } = useEmailGate()
  const [items, setItems] = useState([]) // { id, file, thumb }
  const [pageSize, setPageSize] = useState('fit') // 'fit' | 'a4'
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputName, setOutputName] = useState('images.pdf')
  const [dragIndex, setDragIndex] = useState(null)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['image/*'] })
    setErrors(fileErrors)
    const newItems = valid.map((file) => ({ id: uid(), file, thumb: URL.createObjectURL(file) }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])

  const reorder = useCallback((from, to) => {
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const buildPdf = useCallback(async () => {
    if (items.length === 0) return
    setIsConverting(true)
    setErrors([])
    setProgress(0)
    try {
      let doc = null

      for (let i = 0; i < items.length; i++) {
        const { img, url } = await loadImage(items[i].file)
        const imgW = img.naturalWidth
        const imgH = img.naturalHeight

        let pageW, pageH, drawW, drawH, x, y
        if (pageSize === 'a4') {
          pageW = 595.28
          pageH = 841.89
          const scale = Math.min(pageW / imgW, pageH / imgH)
          drawW = imgW * scale
          drawH = imgH * scale
          x = (pageW - drawW) / 2
          y = (pageH - drawH) / 2
        } else {
          pageW = imgW
          pageH = imgH
          drawW = imgW
          drawH = imgH
          x = 0
          y = 0
        }

        const orientation = pageW > pageH ? 'landscape' : 'portrait'

        if (!doc) {
          // Construct the document with the first page's exact size instead
          // of deleting jsPDF's default page (which throws if it's the only one).
          doc = new jsPDF({ unit: 'pt', orientation, format: [pageW, pageH] })
        } else {
          doc.addPage([pageW, pageH], orientation)
        }

        const format = /png/i.test(items[i].file.type) ? 'PNG' : 'JPEG'
        doc.addImage(img, format, x, y, drawW, drawH)
        URL.revokeObjectURL(url)
        setProgress(((i + 1) / items.length) * 100)
      }

      const blob = doc.output('blob')
      const name = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`
      gatedDownload(() => downloadBlob(blob, name), name, 'Images to PDF')
    } catch (err) {
      setErrors([err.message || 'Something went wrong while building the PDF.'])
    }
    setIsConverting(false)
  }, [items, pageSize, outputName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Combine one or more images into a single PDF. Drag rows to reorder pages.
      </p>

      <Dropzone accept="image/*" multiple onFiles={handleFiles} hint="PNG, JPG, WebP" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {isConverting && <ProgressBar label="Building PDF…" progress={progress} />}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index)
                setDragIndex(null)
              }}
              className="flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-text-dim" strokeWidth={2} />
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-signal-dim font-mono text-[11px] font-medium text-signal">
                {index + 1}
              </span>
              <img src={item.thumb} alt="" className="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-text-dim">{formatBytes(item.file.size)}</p>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-xs text-text-dim hover:text-red-500">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, isConverting, progress, items, dragIndex, reorder, removeItem]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Page size
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPageSize('fit')}
            className={[
              'rounded px-3 py-1.5 text-sm font-medium',
              pageSize === 'fit' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'
            ].join(' ')}
          >
            Fit image
          </button>
          <button
            onClick={() => setPageSize('a4')}
            className={[
              'rounded px-3 py-1.5 text-sm font-medium',
              pageSize === 'a4' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'
            ].join(' ')}
          >
            A4
          </button>
        </div>
      </div>

      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          File name
        </label>
        <input
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
          className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
        />
      </div>

      <button
        onClick={buildPdf}
        disabled={isConverting || items.length === 0}
        className="mt-auto flex w-full flex-shrink-0 items-center justify-center gap-2 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Download className="h-4 w-4" strokeWidth={2} />
        Create PDF
      </button>
    </>
    ),
    [pageSize, outputName, buildPdf, isConverting, items.length]
  )

  return { workspace, settings }
}
