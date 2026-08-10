import { useState, useCallback, useMemo } from 'react'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
} from 'docx'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { extractPageContent, estimateBodyFontSize } from '../utils/pdfTextExtraction.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

// Twips per point/pixel (docx uses twentieths of a point for spacing/indent).
const TWIPS_PER_PT = 20
const LINK_COLOR = '0563C1'

// Build a run's docx child, wrapping it in a hyperlink when the run is linked.
function buildRunChild(run) {
  const textRun = new TextRun({
    text: run.text,
    bold: run.bold,
    italics: run.italic,
    size: Math.max(1, Math.round(run.sizePt * 2)), // docx size is in half-points
    font: run.fontFamily,
    color: run.href ? LINK_COLOR : undefined,
    underline: run.href ? {} : undefined,
  })
  return run.href ? new ExternalHyperlink({ link: run.href, children: [textRun] }) : textRun
}

function buildParagraphFromLine(line, baseFontSizePt) {
  const children = line.runs.map(buildRunChild)

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

// A list item paragraph: strips the source marker glyph (Word renders its own)
// and attaches the right docx bullet/numbering reference.
function buildListParagraphFromLine(line) {
  // Rebuild children; the first run drops the marker glyph (Word draws its own).
  const children = line.runs.map((r, idx) =>
    idx === 0 ? buildRunChild({ ...r, text: line.list.textAfterMarker }) : buildRunChild(r)
  )

  if (line.list.kind === 'bullet') {
    return new Paragraph({ children, bullet: { level: line.list.level } })
  }
  return new Paragraph({
    children,
    numbering: { reference: `num-${line.list.listId}`, level: line.list.level },
  })
}

// Turn a detected table region into a docx Table. Ruled tables get visible
// borders; borderless (alignment-detected) ones get none, so a misdetection
// looks like normally-spaced text rather than a wrong grid.
function buildTableFromRegion(table, baseFontSizePt) {
  const border = table.ruled
    ? { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' }
    : { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const cellBorders = { top: border, bottom: border, left: border, right: border }

  const rows = table.rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell) => {
          const paras =
            cell.lines.length > 0
              ? cell.lines.map((l) => buildParagraphFromLine(l, baseFontSizePt))
              : [new Paragraph({})] // docx requires ≥1 child per cell
          return new TableCell({ children: paras, borders: cellBorders })
        }),
      })
  )

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
}

// Collect the numbering configs for every ordered list encountered, so the
// Document can register them. Bullets need no config (docx has a built-in).
function buildNumberingConfig(pageContents) {
  const seen = new Map()
  for (const { lines } of pageContents) {
    for (const line of lines) {
      if (line.list && line.list.kind === 'ordered' && !seen.has(line.list.listId)) {
        seen.set(line.list.listId, line.list.format)
      }
    }
  }
  return Array.from(seen.entries()).map(([listId, format]) => ({
    reference: `num-${listId}`,
    levels: [0, 1, 2, 3, 4].map((level) => ({
      level,
      format,
      text: `%${level + 1}.`,
      alignment: 'left',
      style: { paragraph: { indent: { left: (level + 1) * 360, hanging: 260 } } },
    })),
  }))
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
        const { lines, images, tables } = await extractPageContent(page, viewport)
        pages.push({ lines, images, tables })
        setProgress((i / pdf.numPages) * 90)
      }

      const allLines = pages.flatMap((p) => p.lines)
      const baseFontSizePt = estimateBodyFontSize(allLines)
      const numberingConfig = buildNumberingConfig(pages)

      const children = []
      pages.forEach((p, idx) => {
        if (pages.length > 1) {
          children.push(new Paragraph({ text: `Page ${idx + 1}`, heading: HeadingLevel.HEADING_3 }))
        }

        // Coalesce soft-wrapped continuation lines (marked joinPrev by the
        // extractor) into their preceding line so paragraphs read continuously
        // in Word instead of breaking at every visual line.
        const merged = []
        for (const line of p.lines) {
          const prev = merged[merged.length - 1]
          if (prev && line.joinPrev && !line.list && !prev.list) {
            const sep = line.joinPrev === 'hyphen' ? '' : ' '
            if (line.joinPrev === 'hyphen' && prev.runs.length) {
              // Drop the trailing hyphen on the previous run before joining.
              const last = prev.runs[prev.runs.length - 1]
              last.text = last.text.replace(/-\s*$/, '')
            } else if (sep && prev.runs.length) {
              prev.runs[prev.runs.length - 1].text += sep
            }
            prev.runs = prev.runs.concat(line.runs)
          } else {
            merged.push({ ...line, runs: [...line.runs] })
          }
        }

        // Interleave text lines, images, and tables in top-to-bottom reading
        // order, reading each text column fully before the next (images/tables
        // default to column 0 — the common single-column case — so plain by-y
        // interleaving holds while multi-column text still respects columns).
        const items = [
          ...merged.map((line) => ({ type: 'line', y: line.y, columnIndex: line.columnIndex ?? 0, line })),
          ...p.images.map((img) => ({ type: 'image', y: img.y, columnIndex: 0, img })),
          ...p.tables.map((table) => ({ type: 'table', y: table.y, columnIndex: 0, table })),
        ].sort((a, b) => a.columnIndex - b.columnIndex || b.y - a.y) // pdf.js y grows upward, so descending y = reading order within a column

        items.forEach((item) => {
          if (item.type === 'line') {
            if (item.line.runs.some((r) => r.text.trim().length > 0)) {
              children.push(
                item.line.list
                  ? buildListParagraphFromLine(item.line)
                  : buildParagraphFromLine(item.line, baseFontSizePt)
              )
            }
          } else if (item.type === 'table') {
            children.push(buildTableFromRegion(item.table, baseFontSizePt))
            children.push(new Paragraph({})) // spacing after the table
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
      const doc = new Document({
        numbering: numberingConfig.length > 0 ? { config: numberingConfig } : undefined,
        sections: [{ children }],
      })
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
          <strong>Close, not pixel-perfect.</strong> Text styling, headings, indentation, bullet &amp; numbered
          lists, hyperlinks, images, and tables (bordered and simple column layouts) are reconstructed from the
          PDF. Exact positioning and complex nested layouts are approximated. Scanned (image-only) PDFs have no
          extractable text.
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
