import { useState, useCallback, useMemo } from 'react'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { extractPageLines } from '../utils/pdfTextExtraction.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

// Reading-order-only extraction — no font/heading/table reconstruction, so
// there's nothing for column layouts or tables to "look broken" in. Reuses
// the same column-clustering + line-grouping as PDF to Word; a paragraph
// break just becomes a blank line rather than docx spacing.
function linesToPlainText(lines) {
  const chunks = []
  lines.forEach((line, i) => {
    const text = line.runs.map((r) => r.text).join('')
    if (i > 0 && line.isParagraphStart) chunks.push('')
    chunks.push(text)
  })
  return chunks.join('\n')
}

export default function usePdfToText() {
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
      setOutputName(`${stripExtension(valid[0].name)}.txt`)
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
      const pageTexts = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const lines = await extractPageLines(page)
        pageTexts.push(linesToPlainText(lines))
        setProgress((i / pdf.numPages) * 90)
      }

      const fullText = pageTexts.join('\n\n')
      setProgress(95)

      const blob = new Blob([fullText], { type: 'text/plain' })
      const trimmedName = outputName.trim() || stripExtension(file.name)
      const resultName = trimmedName.endsWith('.txt') ? trimmedName : `${trimmedName}.txt`
      gatedDownload(() => downloadBlob(blob, resultName), resultName, 'PDF to Text')
      setProgress(100)

      setPreview(fullText.split('\n').slice(0, 14).join('\n') || '(No text found)')
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
        Pull the plain text out of a PDF, in reading order, as a .txt file.
      </p>

      <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
        <p>
          <strong>Text only, no formatting.</strong> No fonts, styling, images, or layout — just the words, in
          reading order, with paragraph breaks preserved. Multi-column PDFs read column by column. Scanned
          (image-only) PDFs won't have any extractable text.
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

      {isWorking && <ProgressBar label="Extracting text…" progress={progress} />}

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
        Convert to .txt
      </button>
    </>
    ),
    [convert, isWorking, file, outputName]
  )

  return { workspace, settings }
}
