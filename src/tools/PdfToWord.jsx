import { useState, useCallback, useMemo } from 'react'
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { extractPageLines, extractPageImages, estimateBodyFontSize } from '../utils/pdfTextExtraction.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

// Twips per point/pixel (docx uses twentieths of a point for spacing/indent).
const TWIPS_PER_PT = 20

function buildParagraphFromLine(line, baseFontSizePt) {
  const children = line.runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        size: Math.max(1, Math.round(run.sizePt * 2)), // docx size is in half-points
        font: run.fontFamily,
      })
  )

  const indentLeft = line.minX > 0 ? Math.round(line.minX * TWIPS_PER_PT) : 0
  // Headings: a line whose dominant font is notably larger than the page's
  // body text reads as a heading rather than a body paragraph.
  const isHeading = line.maxSize >= baseFontSizePt * 1.35 && baseFontSizePt > 0

  return new Paragraph({
    children,
    indent: indentLeft > 0 ? { left: indentLeft } : undefined,
    heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
    // Lines that continue the same source paragraph sit close together;
    // an actual paragraph/heading break gets visible breathing room.
    spacing: { before: line.isParagraphStart ? 160 : 0, after: line.isParagraphStart ? 0 : 40 },
  })
}

export default function usePdfToWord() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState('')

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    if (valid.length > 0) {
      setFile(valid[0])
      setOutputName(`${stripExtension(valid[0].name)}.docx`)
      setPreview('')
    }
  }, [])

  const convert = useCallback(async () => {
    if (!file) return
    setIsWorking(true)
    setErrors([])
    setProgress(0)
    try {
      const buffer = await readAsArrayBuffer(file)
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const pages = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const [lines, images] = await Promise.all([extractPageLines(page), extractPageImages(page, viewport)])
        pages.push({ lines, images })
        setProgress((i / pdf.numPages) * 90)
      }

      const allLines = pages.flatMap((p) => p.lines)
      const baseFontSizePt = estimateBodyFontSize(allLines)

      const children = []
      pages.forEach((p, idx) => {
        if (pages.length > 1) {
          children.push(new Paragraph({ text: `Page ${idx + 1}`, heading: HeadingLevel.HEADING_3 }))
        }

        // Interleave text lines and images in top-to-bottom reading order,
        // reading each text column fully before the next (images don't get
        // column-clustered — most PDFs with inline images are single-column,
        // so defaulting them to column 0 preserves plain by-y interleaving
        // for the common case while still respecting column order for text).
        const items = [
          ...p.lines.map((line) => ({ type: 'line', y: line.y, columnIndex: line.columnIndex ?? 0, line })),
          ...p.images.map((img) => ({ type: 'image', y: img.y, columnIndex: 0, img })),
        ].sort((a, b) => a.columnIndex - b.columnIndex || b.y - a.y) // pdf.js y grows upward, so descending y = reading order within a column

        items.forEach((item) => {
          if (item.type === 'line') {
            if (item.line.runs.some((r) => r.text.trim().length > 0)) {
              children.push(buildParagraphFromLine(item.line, baseFontSizePt))
            }
          } else {
            const maxWidthPt = 468 // ~6.5in usable width at default docx margins
            let { widthPt, heightPt } = item.img
            if (widthPt > maxWidthPt) {
              const ratio = maxWidthPt / widthPt
              widthPt *= ratio
              heightPt *= ratio
            }
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: item.img.png,
                    transformation: { width: Math.round(widthPt), height: Math.round(heightPt) },
                  }),
                ],
                spacing: { after: 120 },
              })
            )
          }
        })

        if (idx < pages.length - 1) children.push(new Paragraph({ text: '' }))
      })

      if (children.length === 0) {
        children.push(new Paragraph({ text: '(No extractable text was found in this PDF — it may be a scanned image.)' }))
      }

      setProgress(95)
      const doc = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(doc)
      const trimmedName = outputName.trim() || stripExtension(file.name)
      const resultName = trimmedName.endsWith('.docx') ? trimmedName : `${trimmedName}.docx`
      gatedDownload(() => downloadBlob(blob, resultName), resultName, 'PDF to Word')
      setProgress(100)

      setPreview(
        allLines
          .map((line) => line.runs.map((r) => r.text).join(''))
          .slice(0, 12)
          .join('\n') || '(No text found)'
      )
    } catch (err) {
      setErrors([`Couldn't read "${file.name}". It may be corrupted or not a valid PDF.`])
    }
    setIsWorking(false)
  }, [file, outputName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Convert a PDF into an editable Word document, preserving text, font styling, and images.
      </p>

      <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
        <p>
          <strong>Close, not pixel-perfect.</strong> Text, font size/bold/italic, indentation, and images are
          reconstructed from the PDF, but multi-column layouts, tables, and exact positioning are approximated —
          this isn't a full page-layout clone. Scanned (image-only) PDFs won't have any extractable text.
        </p>
      </div>

      <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && (
        <div className="rounded-card border border-border bg-panel p-4">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-text-dim">Selected PDF</p>
        </div>
      )}

      {isWorking && <ProgressBar label="Extracting text and images…" progress={progress} />}

      {preview && (
        <div>
          <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
            Preview (first lines)
          </p>
          <pre className="scrollbar-thin max-h-52 overflow-auto whitespace-pre-wrap rounded-card border border-border bg-panel p-4 font-mono text-xs leading-relaxed">
            {preview}
          </pre>
        </div>
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, file, isWorking, progress, preview]
  )

  const settings = useMemo(
    () => (
    <>
      {file && (
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
      )}

      <button
        onClick={convert}
        disabled={isWorking || !file}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Convert to .docx
      </button>
    </>
    ),
    [convert, isWorking, file, outputName]
  )

  return { workspace, settings }
}
