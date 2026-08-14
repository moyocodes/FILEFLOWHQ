import { useState, useCallback, useMemo } from 'react'
import JSZip from 'jszip'
import { Download } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import PdfThumbnail from '../components/PdfThumbnail.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, canvasToBlob, downloadBlob, stripExtension, uid } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

export default function usePdfToImages() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([]) // { id, index, thumb, blob }
  const [scale, setScale] = useState(2)
  const [baseName, setBaseName] = useState('')
  const [errors, setErrors] = useState([])
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    if (valid.length > 0) {
      setFile(valid[0])
      setBaseName(stripExtension(valid[0].name))
      setPages([])
    }
  }, [])

  const convert = useCallback(async () => {
    if (!file) return
    setIsConverting(true)
    setErrors([])
    setProgress(0)
    setPages([])
    try {
      const buffer = await readAsArrayBuffer(file)
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const results = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        const blob = await canvasToBlob(canvas, 'image/png')
        results.push({ id: uid(), index: i, thumb: canvas.toDataURL('image/png'), blob })
        setProgress((i / pdf.numPages) * 100)
      }
      setPages(results)
    } catch (err) {
      setErrors([
        /password/i.test(err.message)
          ? 'This PDF is password-protected and can’t be read in the browser.'
          : `Couldn’t read "${file.name}". It may be corrupted or not a valid PDF.`
      ])
    }
    setIsConverting(false)
  }, [file, scale])

  const downloadPage = useCallback(
    (page) => {
      const prefix = baseName.trim() || stripExtension(file.name)
      const name = `${prefix}-page-${page.index}.png`
      gatedDownload(() => downloadBlob(page.blob, name), name, 'PDF to Images')
    },
    [file, baseName, gatedDownload]
  )

  const downloadAllZip = useCallback(async () => {
    const prefix = baseName.trim() || stripExtension(file.name)
    const zip = new JSZip()
    pages.forEach((p) => zip.file(`${prefix}-page-${p.index}.png`, p.blob))
    const content = await zip.generateAsync({ type: 'blob' })
    const name = `${prefix}-pages.zip`
    gatedDownload(() => downloadBlob(content, name), name, 'PDF to Images')
  }, [pages, file, baseName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Render every page of a PDF as a PNG image, right in your browser.
      </p>

      <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && pages.length === 0 && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-panel p-4">
          <PdfThumbnail file={file} className="h-16 w-12 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-text-dim">Selected PDF</p>
          </div>
        </div>
      )}

      {isConverting && <ProgressBar label="Rendering pages…" progress={progress} />}

      {pages.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page) => (
              <div key={page.id} className="group relative overflow-hidden rounded-lg border border-border">
                <img src={page.thumb} alt={`Page ${page.index}`} className="aspect-[3/4] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-2 py-1 text-xs text-white">
                  <span>Page {page.index}</span>
                  <button onClick={() => downloadPage(page)} aria-label={`Download page ${page.index}`}>
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={downloadAllZip} className="text-sm font-medium text-signal hover:underline">
            Download all pages as a .zip
          </button>
        </>
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, file, isConverting, progress, pages, downloadPage, downloadAllZip]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Resolution
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium',
                scale === s ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'
              ].join(' ')}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {file && (
        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            File name prefix
          </label>
          <input
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
          />
          <p className="mt-1.5 text-xs text-text-dim">Pages download as "{baseName || 'name'}-page-1.png", etc.</p>
        </div>
      )}

      <button
        onClick={convert}
        disabled={isConverting || !file}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Split into images
      </button>
    </>
    ),
    [scale, baseName, convert, isConverting, file]
  )

  return { workspace, settings }
}
