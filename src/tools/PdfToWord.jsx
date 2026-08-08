import { useState, useCallback, useMemo } from 'react'
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

// Twips per point/pixel (docx uses twentieths of a point for spacing/indent).
const TWIPS_PER_PT = 20

// pdf.js "device space" for getTextContent/getOperatorList is in CSS pixels
// at 96dpi, which equals points (1px = 1pt at scale 1). We use that directly
// as our point measurements, matching what the PDF author authored in.
function fontSizeFromTransform(transform) {
  // transform = [a, b, c, d, e, f]; the glyph height scale is the length of
  // the (c, d) vector, which is robust to rotation/skew, unlike using `d` alone.
  const [, , c, d] = transform
  return Math.hypot(c, d) || 1
}

function cleanFontFamily(name) {
  if (!name) return undefined
  // Real font names (e.g. "Helvetica-BoldOblique", "ABCDEF+Arial-BoldMT")
  // carry a subset tag prefix and style suffix we don't want in the family name.
  const withoutSubsetTag = name.replace(/^[A-Z]{6}\+/, '')
  const withoutStyleSuffix = withoutSubsetTag.replace(/[-,]?(Bold|Italic|Oblique|BoldItalic|MT|PS)+$/gi, '').trim()
  return withoutStyleSuffix || undefined
}

// Resolve the real font object (with .bold/.italic/.name) for each distinct
// fontName used on the page. getTextContent()'s own `styles` map only gives a
// generic CSS fallback family (e.g. "sans-serif") — the actual PostScript
// name and weight/style flags live on the font object in objs/commonObjs,
// which is only populated once an operator list has been requested.
async function resolveFontInfoByName(page, fontNames) {
  await page.getOperatorList()
  const infoByName = new Map()
  await Promise.all(
    Array.from(fontNames).map(async (fontName) => {
      const info = await resolvePageObject(page, fontName)
      infoByName.set(fontName, info)
    })
  )
  return infoByName
}

// Resolve a pdf.js image object (from page.objs/commonObjs) to PNG bytes via canvas.
async function imageObjectToPngBytes(imgData) {
  const { width, height } = imgData
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (imgData.bitmap) {
    ctx.drawImage(imgData.bitmap, 0, 0)
  } else if (imgData.data) {
    const rgba = new Uint8ClampedArray(width * height * 4)
    const src = imgData.data
    const channels = src.length / (width * height)
    if (channels === 4) {
      rgba.set(src)
    } else if (channels === 3) {
      for (let p = 0; p < width * height; p++) {
        rgba[p * 4] = src[p * 3]
        rgba[p * 4 + 1] = src[p * 3 + 1]
        rgba[p * 4 + 2] = src[p * 3 + 2]
        rgba[p * 4 + 3] = 255
      }
    } else if (channels === 1) {
      for (let p = 0; p < width * height; p++) {
        const v = src[p]
        rgba[p * 4] = v
        rgba[p * 4 + 1] = v
        rgba[p * 4 + 2] = v
        rgba[p * 4 + 3] = 255
      }
    } else {
      return null
    }
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  } else {
    return null
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return null
  return new Uint8Array(await blob.arrayBuffer())
}

function resolvePageObject(page, objId) {
  const source = objId.startsWith('g_') ? page.commonObjs : page.objs
  return new Promise((resolve) => {
    try {
      source.get(objId, resolve)
    } catch {
      resolve(null)
    }
  })
}

// Walk the operator list tracking the CTM so we know where + how large each
// painted image is, then resolve + decode each one to PNG bytes.
async function extractPageImages(page, viewport) {
  const opList = await page.getOperatorList()
  const OPS = pdfjsLib.OPS
  const images = []

  // Matrix stack: each entry is a 2D affine transform [a,b,c,d,e,f].
  let stack = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const multiply = (m1, m2) => [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ]

  const pending = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]

    if (fn === OPS.save) {
      stack.push(ctm)
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ctm
    } else if (fn === OPS.transform) {
      ctm = multiply(args, ctm)
    } else if (fn === OPS.paintImageXObject) {
      const [objId, w, h] = args
      // CTM maps unit square [0,1]x[0,1] to the image's placement in page
      // space; the resulting scale vectors give width/height in points.
      const widthPt = Math.hypot(ctm[0], ctm[1])
      const heightPt = Math.hypot(ctm[2], ctm[3])
      // Page-space y grows upward; convert to top-down for reading order.
      const topY = viewport.height / (viewport.scale || 1) - ctm[5]
      pending.push({ objId, w, h, widthPt, heightPt, y: topY })
    } else if (fn === OPS.paintInlineImageXObject) {
      const inline = args[0]
      const widthPt = Math.hypot(ctm[0], ctm[1])
      const heightPt = Math.hypot(ctm[2], ctm[3])
      const topY = viewport.height / (viewport.scale || 1) - ctm[5]
      pending.push({ inlineData: inline, widthPt, heightPt, y: topY })
    }
  }

  for (const item of pending) {
    try {
      const imgData = item.inlineData || (await resolvePageObject(page, item.objId))
      if (!imgData) continue
      const png = await imageObjectToPngBytes(imgData)
      if (!png) continue
      images.push({ y: item.y, widthPt: item.widthPt, heightPt: item.heightPt, png })
    } catch {
      // Skip images we can't decode rather than failing the whole conversion.
    }
  }

  return images
}

async function extractPageLines(page) {
  const content = await page.getTextContent()
  const textItems = content.items.filter((item) => item.str && item.str.trim().length > 0)

  const fontInfoByName = await resolveFontInfoByName(page, new Set(textItems.map((item) => item.fontName)))

  const runs = textItems.map((item) => {
    const fontInfo = fontInfoByName.get(item.fontName)
    return {
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      sizePt: fontSizeFromTransform(item.transform),
      bold: Boolean(fontInfo?.bold || fontInfo?.black),
      italic: Boolean(fontInfo?.italic),
      fontFamily: cleanFontFamily(fontInfo?.name) || cleanFontFamily(fontInfo?.fallbackName),
    }
  })

  // getTextContent() returns items in content-stream order, which for
  // multi-column layouts, tables, or interleaved graphics state is often NOT
  // top-to-bottom reading order. Sort by position first (pdf.js y grows
  // upward, so descending y = top to bottom) so line-grouping below sees
  // visually adjacent runs consecutively instead of jumbled stream order.
  const orderedRuns = [...runs].sort((a, b) => b.y - a.y || a.x - b.x)

  // Group into visual lines by y-position (within a fraction of the line's font size).
  const lines = []
  let current = null
  for (const run of orderedRuns) {
    if (current && Math.abs(run.y - current.y) <= Math.max(2, current.maxSize * 0.35)) {
      current.runs.push(run)
      current.maxSize = Math.max(current.maxSize, run.sizePt)
      current.minX = Math.min(current.minX, run.x)
    } else {
      if (current) lines.push(current)
      current = { y: run.y, maxSize: run.sizePt, minX: run.x, runs: [run] }
    }
  }
  if (current) lines.push(current)

  // Each line's runs may arrive out of x-order for rotated/complex PDFs; sort defensively.
  lines.forEach((line) => line.runs.sort((a, b) => a.x - b.x))

  // Mark whether a line starts a new paragraph: the gap to the previous line
  // is noticeably larger than a normal line-to-line step, which usually
  // means a blank line or paragraph break in the source PDF.
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      lines[i].isParagraphStart = true
      continue
    }
    const prev = lines[i - 1]
    const gap = prev.y - lines[i].y
    const normalStep = prev.maxSize * 1.35
    lines[i].isParagraphStart = gap > normalStep * 1.6 || gap <= 0
  }

  return lines
}

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

function estimateBodyFontSize(lines) {
  const sizes = lines.flatMap((line) => line.runs.map((r) => r.sizePt))
  if (sizes.length === 0) return 12
  sizes.sort((a, b) => a - b)
  return sizes[Math.floor(sizes.length / 2)]
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

        // Interleave text lines and images in top-to-bottom reading order.
        const items = [
          ...p.lines.map((line) => ({ type: 'line', y: line.y, line })),
          ...p.images.map((img) => ({ type: 'image', y: img.y, img })),
        ].sort((a, b) => b.y - a.y) // pdf.js y grows upward, so descending y = reading order

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
