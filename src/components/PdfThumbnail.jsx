import { useEffect, useState } from 'react'
import { FileWarning } from 'lucide-react'
import pdfjsLib from '../utils/pdfjsSetup.js'

const THUMB_WIDTH = 96

/** Renders a PDF's first page as a small thumbnail image. */
export default function PdfThumbnail({ file, className = '' }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setFailed(false)

    async function render() {
      try {
        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        const page = await pdf.getPage(1)
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = THUMB_WIDTH / baseViewport.width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise

        if (!cancelled) setDataUrl(canvas.toDataURL('image/png'))
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [file])

  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded border border-border bg-void ${className}`}>
        <FileWarning className="h-5 w-5 text-text-dim" strokeWidth={2} />
      </div>
    )
  }

  if (!dataUrl) {
    return <div className={`animate-pulse rounded border border-border bg-void ${className}`} />
  }

  return (
    <img
      src={dataUrl}
      alt=""
      className={`rounded border border-border object-cover object-top ${className}`}
    />
  )
}
