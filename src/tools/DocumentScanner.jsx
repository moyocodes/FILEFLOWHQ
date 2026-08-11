import { useState, useCallback, useMemo, useRef } from 'react'
import { GripVertical, Download, Camera as CameraIcon, Plus, Pencil } from 'lucide-react'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import PageEditorModal from '../components/PageEditorModal.jsx'
import { downloadBlob, uid } from '../utils/fileHelpers.js'
import { buildImagesPdf } from '../utils/imagesToPdf.js'
import { isNative } from '../utils/platform.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

/**
 * Document Scanner — capture pages with the device camera and save them as a
 * single PDF.
 *
 *  - Native (iOS/Android via Capacitor): uses @capacitor/camera, lazy-imported
 *    so its plugin code never enters the web bundle.
 *  - Web: a file input with capture="environment" — on a phone browser this
 *    opens the rear camera; on desktop it falls back to the file picker, so the
 *    tool still works everywhere.
 *
 * Pages become images that share the exact PDF-building path as "Images to PDF"
 * (see utils/imagesToPdf.js), then save through the one download seam.
 */

/** Convert a data: URL to a Blob so it can be thumbnailed and fed to the PDF builder. */
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/jpeg'
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export default function useDocumentScanner() {
  const { gatedDownload } = useEmailGate()
  const [pages, setPages] = useState([]) // { id, blob, thumb }
  const [pageSize, setPageSize] = useState('a4') // scans default to A4
  const [errors, setErrors] = useState([])
  const [isBuilding, setIsBuilding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputName, setOutputName] = useState('scan.pdf')
  const [dragIndex, setDragIndex] = useState(null)
  const [editingPageId, setEditingPageId] = useState(null)
  // When set, the next captured photo replaces this page instead of appending a new one.
  const retakeTargetRef = useRef(null)
  const webInputRef = useRef(null)

  const addBlob = useCallback((blob) => {
    const retakeId = retakeTargetRef.current
    retakeTargetRef.current = null
    if (retakeId) {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== retakeId) return p
          URL.revokeObjectURL(p.thumb)
          return { ...p, blob, thumb: URL.createObjectURL(blob) }
        })
      )
      return
    }
    setPages((prev) => [...prev, { id: uid(), blob, thumb: URL.createObjectURL(blob) }])
  }, [])

  // Native capture via the Capacitor Camera plugin.
  const captureNative = useCallback(async () => {
    setErrors([])
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
      })
      if (photo?.dataUrl) addBlob(dataUrlToBlob(photo.dataUrl))
      else retakeTargetRef.current = null
    } catch (err) {
      retakeTargetRef.current = null
      // The user canceling the camera is not an error worth surfacing.
      const msg = (err && (err.message || String(err))) || ''
      if (!/cancel/i.test(msg)) {
        setErrors(['Could not open the camera. Check that camera access is allowed.'])
      }
    }
  }, [addBlob])

  // Web capture — file input; capture="environment" opens the camera on mobile.
  const onWebFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) {
        retakeTargetRef.current = null
        return
      }
      // Retake only ever replaces with the first picked image.
      if (retakeTargetRef.current) {
        addBlob(files[0])
        return
      }
      files.forEach((f) => addBlob(f))
    },
    [addBlob]
  )

  const addPage = useCallback(() => {
    if (isNative) captureNative()
    else webInputRef.current?.click()
  }, [captureNative])

  const retakePage = useCallback(
    (id) => {
      retakeTargetRef.current = id
      setEditingPageId(null)
      if (isNative) captureNative()
      else webInputRef.current?.click()
    },
    [captureNative]
  )

  const updatePageBlob = useCallback((id, blob) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        URL.revokeObjectURL(p.thumb)
        return { ...p, blob, thumb: URL.createObjectURL(blob) }
      })
    )
    setEditingPageId(null)
  }, [])

  const removePage = useCallback((id) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.thumb)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const reorder = useCallback((from, to) => {
    setPages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const buildPdf = useCallback(async () => {
    if (pages.length === 0) return
    setIsBuilding(true)
    setErrors([])
    setProgress(0)
    try {
      const blob = await buildImagesPdf(
        pages.map((p) => p.blob),
        { pageSize, onProgress: (f) => setProgress(f * 100) }
      )
      const name = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`
      gatedDownload(() => downloadBlob(blob, name), name, 'Document Scanner')
    } catch (err) {
      setErrors([err.message || 'Something went wrong while building the PDF.'])
    }
    setIsBuilding(false)
  }, [pages, pageSize, outputName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Snap each page with your camera and combine them into a single PDF. Add as
          many pages as you like, then drag to reorder before saving.
        </p>

        {/* Big capture target. On the web this is a file input (camera on mobile,
            picker on desktop); on device it triggers the native camera. */}
        <button
          onClick={addPage}
          className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-card border-[1.5px] border-dashed border-border-strong bg-panel px-6 py-12 text-center transition-colors hover:border-signal hover:bg-signal-dim"
        >
          <CameraIcon className="h-7 w-7 text-text-dim" strokeWidth={2} />
          <div>
            <p className="text-[0.92rem] font-medium">
              {pages.length === 0 ? 'Scan a page' : 'Add another page'}
            </p>
            <p className="mt-1 text-[0.76rem] text-text-dim">
              {isNative
                ? 'Opens your camera — nothing leaves your device'
                : 'Uses your camera on mobile, or pick an image on desktop'}
            </p>
          </div>
        </button>

        {/* Hidden web input, only used off-device. */}
        {!isNative && (
          <input
            ref={webInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onWebFiles(e.target.files)
              e.target.value = ''
            }}
          />
        )}

        <ErrorBanner messages={errors} onDismiss={clearErrors} />

        {isBuilding && <ProgressBar label="Building PDF…" progress={progress} />}

        {pages.length > 0 && (
          <div className="space-y-2">
            {pages.map((page, index) => (
              <div
                key={page.id}
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
                <button onClick={() => setEditingPageId(page.id)} className="flex-shrink-0">
                  <img src={page.thumb} alt="" className="h-10 w-10 rounded-md object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Page {index + 1}</p>
                </div>
                <button
                  onClick={() => setEditingPageId(page.id)}
                  className="flex items-center gap-1 text-xs text-text-dim hover:text-signal"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Edit
                </button>
                <button onClick={() => removePage(page.id)} className="text-xs text-text-dim hover:text-red-500">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {editingPageId &&
          (() => {
            const page = pages.find((p) => p.id === editingPageId)
            if (!page) return null
            return (
              <PageEditorModal
                blob={page.blob}
                onSave={(blob) => updatePageBlob(page.id, blob)}
                onRetake={() => retakePage(page.id)}
                onClose={() => setEditingPageId(null)}
              />
            )
          })()}
      </div>
    ),
    [
      addPage,
      onWebFiles,
      pages,
      errors,
      clearErrors,
      isBuilding,
      progress,
      dragIndex,
      reorder,
      removePage,
      editingPageId,
      updatePageBlob,
      retakePage,
    ]
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
              onClick={() => setPageSize('a4')}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium',
                pageSize === 'a4' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim',
              ].join(' ')}
            >
              A4
            </button>
            <button
              onClick={() => setPageSize('fit')}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium',
                pageSize === 'fit' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim',
              ].join(' ')}
            >
              Fit photo
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
          onClick={addPage}
          className="flex w-full items-center justify-center gap-2 rounded border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-signal"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add page
        </button>

        <button
          onClick={buildPdf}
          disabled={isBuilding || pages.length === 0}
          className="mt-auto flex w-full flex-shrink-0 items-center justify-center gap-2 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          Save as PDF
        </button>
      </>
    ),
    [pageSize, outputName, addPage, buildPdf, isBuilding, pages.length]
  )

  return { workspace, settings }
}
