import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, RotateCw, X, Check, Camera as CameraIcon } from 'lucide-react'
import { loadImage, canvasToBlob } from '../utils/fileHelpers.js'

const HANDLE_SIZE = 22

/** Clamp a point to stay inside the image bounds. */
function clampPoint(pt, w, h) {
  return { x: Math.min(Math.max(pt.x, 0), w), y: Math.min(Math.max(pt.y, 0), h) }
}

/**
 * Full-screen editor for a single scanned page: rotate in 90° steps and drag
 * a crop rectangle's corners, then bake both into a new Blob on save.
 */
export default function PageEditorModal({ blob, onSave, onRetake, onClose }) {
  const [img, setImg] = useState(null)
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [crop, setCrop] = useState(null) // { x, y, w, h } in rotated-image pixel space
  const [displayScale, setDisplayScale] = useState(1)
  const [dragHandle, setDragHandle] = useState(null) // 'tl' | 'tr' | 'bl' | 'br' | 'move' | null
  const [isSaving, setIsSaving] = useState(false)
  const dragStartRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    loadImage(blob).then(({ img: loaded, url }) => {
      if (cancelled) return
      objectUrl = url
      setImg(loaded)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  // Rotated pixel dimensions (swap for 90/270).
  const rotatedSize = img
    ? rotation % 180 === 0
      ? { w: img.naturalWidth, h: img.naturalHeight }
      : { w: img.naturalHeight, h: img.naturalWidth }
    : null

  // Reset the crop to the full image whenever the image loads or rotation changes.
  useEffect(() => {
    if (!rotatedSize) return
    setCrop({ x: 0, y: 0, w: rotatedSize.w, h: rotatedSize.h })
  }, [rotatedSize?.w, rotatedSize?.h])

  // Fit the image into the available stage area, tracked for handle math.
  useEffect(() => {
    if (!rotatedSize || !stageRef.current) return
    const update = () => {
      const rect = stageRef.current.getBoundingClientRect()
      const scale = Math.min(rect.width / rotatedSize.w, rect.height / rotatedSize.h, 1)
      setDisplayScale(scale)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [rotatedSize?.w, rotatedSize?.h])

  const rotate = useCallback((dir) => {
    setRotation((r) => (r + (dir === 'cw' ? 90 : 270)) % 360)
  }, [])

  const toDisplay = useCallback((pt) => ({ x: pt.x * displayScale, y: pt.y * displayScale }), [displayScale])

  const handlePointerDown = useCallback(
    (handle, e) => {
      e.preventDefault()
      e.stopPropagation()
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, crop: { ...crop } }
      setDragHandle(handle)
    },
    [crop]
  )

  useEffect(() => {
    if (!dragHandle || !rotatedSize) return

    const onMove = (e) => {
      const start = dragStartRef.current
      if (!start) return
      const dx = (e.clientX - start.clientX) / displayScale
      const dy = (e.clientY - start.clientY) / displayScale
      const { crop: c0 } = start
      let next = { ...c0 }

      if (dragHandle === 'move') {
        const x = Math.min(Math.max(c0.x + dx, 0), rotatedSize.w - c0.w)
        const y = Math.min(Math.max(c0.y + dy, 0), rotatedSize.h - c0.h)
        next = { ...c0, x, y }
      } else {
        let left = c0.x
        let top = c0.y
        let right = c0.x + c0.w
        let bottom = c0.y + c0.h

        if (dragHandle.includes('l')) left = clampPoint({ x: c0.x + dx, y: 0 }, rotatedSize.w, rotatedSize.h).x
        if (dragHandle.includes('r')) right = clampPoint({ x: right + dx, y: 0 }, rotatedSize.w, rotatedSize.h).x
        if (dragHandle.includes('t')) top = clampPoint({ x: 0, y: c0.y + dy }, rotatedSize.w, rotatedSize.h).y
        if (dragHandle.includes('b')) bottom = clampPoint({ x: 0, y: bottom + dy }, rotatedSize.w, rotatedSize.h).y

        const MIN = 24
        if (right - left < MIN) {
          if (dragHandle.includes('l')) left = right - MIN
          else right = left + MIN
        }
        if (bottom - top < MIN) {
          if (dragHandle.includes('t')) top = bottom - MIN
          else bottom = top + MIN
        }

        next = { x: left, y: top, w: right - left, h: bottom - top }
      }

      setCrop(next)
    }

    const onUp = () => {
      dragStartRef.current = null
      setDragHandle(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragHandle, displayScale, rotatedSize])

  const handleSave = useCallback(async () => {
    if (!img || !crop || !rotatedSize) return
    setIsSaving(true)
    try {
      // Draw the source image rotated onto a full-size canvas first.
      const rotCanvas = document.createElement('canvas')
      rotCanvas.width = rotatedSize.w
      rotCanvas.height = rotatedSize.h
      const rctx = rotCanvas.getContext('2d')
      rctx.save()
      rctx.translate(rotatedSize.w / 2, rotatedSize.h / 2)
      rctx.rotate((rotation * Math.PI) / 180)
      rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      rctx.restore()

      // Then crop.
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = Math.round(crop.w)
      cropCanvas.height = Math.round(crop.h)
      const cctx = cropCanvas.getContext('2d')
      cctx.drawImage(rotCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)

      const outBlob = await canvasToBlob(cropCanvas, blob.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92)
      onSave(outBlob)
    } finally {
      setIsSaving(false)
    }
  }, [img, crop, rotatedSize, rotation, blob, onSave])

  const hasChanges =
    rotation !== 0 ||
    (crop && rotatedSize && (crop.x !== 0 || crop.y !== 0 || crop.w !== rotatedSize.w || crop.h !== rotatedSize.h))

  const handles = crop
    ? [
        { id: 'tl', x: crop.x, y: crop.y, cursor: 'nwse-resize' },
        { id: 'tr', x: crop.x + crop.w, y: crop.y, cursor: 'nesw-resize' },
        { id: 'bl', x: crop.x, y: crop.y + crop.h, cursor: 'nesw-resize' },
        { id: 'br', x: crop.x + crop.w, y: crop.y + crop.h, cursor: 'nwse-resize' },
      ]
    : []

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex flex-col bg-void/95 backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text"
          >
            <X className="h-4.5 w-4.5" strokeWidth={2.25} />
          </button>
          <p className="text-sm font-medium">Edit page</p>
          <button
            onClick={handleSave}
            disabled={isSaving || !img}
            className="flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Done
          </button>
        </div>

        <div ref={stageRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
          {img && rotatedSize && crop && (
            <div
              className="relative"
              style={{ width: rotatedSize.w * displayScale, height: rotatedSize.h * displayScale }}
            >
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: img.naturalWidth * displayScale,
                  height: img.naturalHeight * displayScale,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }}
              />

              {/* Dimmed overlay outside the crop rect */}
              <div className="pointer-events-none absolute inset-0">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <mask id="crop-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={toDisplay(crop).x}
                        y={toDisplay(crop).y}
                        width={crop.w * displayScale}
                        height={crop.h * displayScale}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
                </svg>
              </div>

              {/* Crop rectangle border + move handle */}
              <div
                onPointerDown={(e) => handlePointerDown('move', e)}
                className="absolute cursor-move border-2 border-signal"
                style={{
                  left: toDisplay(crop).x,
                  top: toDisplay(crop).y,
                  width: crop.w * displayScale,
                  height: crop.h * displayScale,
                }}
              />

              {handles.map((h) => {
                const d = toDisplay(h)
                return (
                  <div
                    key={h.id}
                    onPointerDown={(e) => handlePointerDown(h.id, e)}
                    className="absolute rounded-full border-2 border-signal bg-void shadow-md"
                    style={{
                      left: d.x - HANDLE_SIZE / 2,
                      top: d.y - HANDLE_SIZE / 2,
                      width: HANDLE_SIZE,
                      height: HANDLE_SIZE,
                      cursor: h.cursor,
                      touchAction: 'none',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
          <button
            onClick={() => rotate('ccw')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm text-text-dim hover:border-signal hover:text-text"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Rotate
          </button>
          <button
            onClick={() => rotate('cw')}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm text-text-dim hover:border-signal hover:text-text"
          >
            <RotateCw className="h-4 w-4" strokeWidth={2} />
            Rotate
          </button>
          {rotatedSize && crop && (crop.x !== 0 || crop.y !== 0 || crop.w !== rotatedSize.w || crop.h !== rotatedSize.h) && (
            <button
              onClick={() => setCrop({ x: 0, y: 0, w: rotatedSize.w, h: rotatedSize.h })}
              className="rounded-full border border-border px-3.5 py-2 text-sm text-text-dim hover:border-signal hover:text-text"
            >
              Reset crop
            </button>
          )}
          {onRetake && (
            <button
              onClick={onRetake}
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm text-text-dim hover:border-signal hover:text-text"
            >
              <CameraIcon className="h-4 w-4" strokeWidth={2} />
              Retake
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
