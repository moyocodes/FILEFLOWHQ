import { useState, useCallback, useMemo } from 'react'
import { Info, Cpu } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ResultCard from '../components/ResultCard.jsx'
import PdfThumbnail from '../components/PdfThumbnail.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { extractPageLines } from '../utils/pdfTextExtraction.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'
import { usePreview } from '../context/PreviewContext.jsx'
import { runEngine, enginesSupported, ENGINES } from '../utils/engines.js'

// Every output but .txt comes from the Studio PDF engine (pdfcraft's own exporter).
const FORMATS = {
  docx: { label: 'Word', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', tool: 'PDF to Word' },
  pptx: { label: 'PowerPoint', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', tool: 'PDF to PowerPoint' },
  html: { label: 'Web page', ext: 'html', mime: 'text/html', tool: 'PDF to HTML' },
  rtf: { label: 'Rich text', ext: 'rtf', mime: 'application/rtf', tool: 'PDF to RTF' },
  txt: { label: 'Plain text', ext: 'txt', mime: 'text/plain', tool: 'PDF to Text' },
}

// Reading-order-only extraction — no font/heading/table reconstruction, so
// there's nothing for column layouts or tables to "look broken" in.
function linesToPlainText(lines) {
  const chunks = []
  lines.forEach((line, i) => {
    const text = line.runs.map((r) => r.text).join('')
    if (i > 0 && line.isParagraphStart) chunks.push('')
    chunks.push(text)
  })
  return chunks.join('\n')
}

async function plainText(buffer, onProgress) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    pageTexts.push(linesToPlainText(await extractPageLines(await pdf.getPage(i))))
    onProgress?.((i / pdf.numPages) * 90)
  }
  return pageTexts.join('\n\n')
}

export default function usePdfToWord() {
  const { gatedDownload } = useEmailGate()
  const { preview: showPreview } = usePreview()
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('docx')
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState('')

  const handleFiles = useCallback(
    (files) => {
      const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
      setErrors(fileErrors)
      if (valid.length > 0) {
        setFile(valid[0])
        setOutputName(`${stripExtension(valid[0].name)}-converted.${format}`)
        setResult(null)
        setPreview('')
      }
    },
    [format]
  )

  const changeFormat = useCallback(
    (next) => {
      setFormat(next)
      setResult(null)
      setPreview('')
      if (file) setOutputName(`${stripExtension(file.name)}-converted.${next}`)
    },
    [file]
  )

  /** Bytes of the chosen format, from the Studio engine where it can. */
  const produce = useCallback(async (buffer) => {
    if (format === 'txt') {
      setStatus('Extracting text…')
      const text = await plainText(buffer, setProgress)
      return { bytes: new TextEncoder().encode(text), text }
    }
    if (!enginesSupported) throw new Error('This conversion needs a current browser (WebAssembly).')
    setStatus(`Loading the Studio PDF engine (${ENGINES.pdf.size}, first time only)…`)
    setProgress(15)
    const slow = setTimeout(() => setStatus('Converting with the Studio PDF engine…'), 1500)
    try {
      return { bytes: await runEngine('pdf', 'convert', new Uint8Array(buffer), format) }
    } finally {
      clearTimeout(slow)
    }
  }, [format])

  const convert = useCallback(async () => {
    if (!file) return
    setIsWorking(true)
    setErrors([])
    setResult(null)
    setPreview('')
    setProgress(10)
    try {
      const { label, ext, mime, tool } = FORMATS[format]
      const buffer = await readAsArrayBuffer(file)
      const { bytes, text } = await produce(buffer)
      setProgress(95)
      const blob = new Blob([bytes], { type: mime })
      const trimmedName = outputName.trim() || stripExtension(file.name)
      const resultName = trimmedName.endsWith(`.${ext}`) ? trimmedName : `${trimmedName}.${ext}`
      if (format === 'txt') setPreview(text.split('\n').slice(0, 14).join('\n') || '(No text found)')
      else showPreview({ blob, name: resultName, onDownload: () => gatedDownload(() => downloadBlob(blob, resultName), resultName, tool) })
      setResult({ name: resultName, size: blob.size, blob, toolName: tool, label })
      setProgress(100)
    } catch (err) {
      setErrors([err.message || `Couldn't convert "${file.name}". It may be corrupted or not a valid PDF.`])
    }
    setIsWorking(false)
  }, [file, format, outputName, produce, gatedDownload, showPreview])

  const downloadAgain = useCallback(() => {
    if (!result) return
    gatedDownload(() => downloadBlob(result.blob, result.name), result.name, result.toolName)
  }, [result, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        {format === 'txt'
          ? 'Pull the plain text out of a PDF, in reading order, as a .txt file.'
          : `Turn a PDF into an editable ${FORMATS[format].label} file: paragraphs, headings, fonts, colours, tables and images.`}
      </p>

      {format === 'txt' ? (
        <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <p>
            <strong>Text only, no formatting, stays on your device.</strong> No fonts, styling, images, or layout —
            just the words, in reading order. Scanned (image-only) PDFs won't have any extractable text.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
          <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <p>
            <strong>Powered by the Studio PDF engine.</strong> The same processor as our PDF Editor runs on your
            device, so nothing is uploaded. It downloads once ({ENGINES.pdf.size}); after that it's instant.
          </p>
        </div>
      )}

      <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time" privacyNote="nothing leaves your device" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && !result && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-panel p-4">
          <PdfThumbnail file={file} className="h-16 w-12 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-normal">{file.name}</p>
            <p className="text-xs text-text-dim">Selected PDF</p>
          </div>
        </div>
      )}

      {isWorking && <ProgressBar label={status} progress={progress} />}

      {result && file && (
        <ResultCard beforeName={file.name} beforeSize={file.size} afterName={result.name} afterSize={result.size} />
      )}

      {preview && (
        <div>
          <p className="mb-1.5 font-mono text-xs font-normal uppercase tracking-wide text-text-dim">
            Preview (first lines)
          </p>
          <pre className="scrollbar-thin max-h-52 overflow-auto whitespace-pre-wrap rounded-card border border-border bg-panel p-4 font-mono text-xs leading-relaxed">
            {preview}
          </pre>
        </div>
      )}
    </div>
    ),
    [format, handleFiles, clearErrors, errors, file, isWorking, progress, status, result, preview]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Output
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(FORMATS).map(([id, f]) => (
            <button
              key={id}
              onClick={() => changeFormat(id)}
              className={[
                'rounded px-3 py-1.5 text-sm font-normal transition-colors',
                format === id ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim hover:text-text'
              ].join(' ')}
            >
              {f.label} (.{f.ext})
            </button>
          ))}
        </div>
      </div>

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
        onClick={result ? downloadAgain : convert}
        disabled={isWorking || !file}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {result ? 'Download again' : `Convert to .${format}`}
      </button>
    </>
    ),
    [convert, isWorking, file, outputName, format, changeFormat, result, downloadAgain]
  )

  return { workspace, settings }
}
