import { useState, useCallback, useMemo } from 'react'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ResultCard from '../components/ResultCard.jsx'
import PdfThumbnail from '../components/PdfThumbnail.jsx'
import pdfjsLib from '../utils/pdfjsSetup.js'
import { validateFiles, readAsArrayBuffer, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { extractPageLines } from '../utils/pdfTextExtraction.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'
import { apiUrl } from '../utils/api'

// Matches the Vercel serverless function's request body ceiling (api/pdf-to-word.js).
const MAX_UPLOAD_SIZE = 4.5 * 1024 * 1024

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

export default function usePdfToWord() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('docx') // 'docx' (Adobe, styled) | 'txt' (local, plain)
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState('')

  const handleFiles = useCallback(
    (files) => {
      const { valid, errors: fileErrors } = validateFiles(files, {
        accept: ['.pdf', 'application/pdf'],
        maxSize: format === 'docx' ? MAX_UPLOAD_SIZE : undefined,
      })
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

  const convertToWord = useCallback(async () => {
    const response = await fetch(apiUrl('/api/pdf-to-word'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    })
    setProgress(80)

    if (!response.ok) {
      const { error } = await response.json().catch(() => ({}))
      throw new Error(error || 'Conversion failed.')
    }

    const blob = await response.blob()
    const trimmedName = outputName.trim() || stripExtension(file.name)
    const resultName = trimmedName.endsWith('.docx') ? trimmedName : `${trimmedName}.docx`
    gatedDownload(() => downloadBlob(blob, resultName), resultName, 'PDF to Word')
    setResult({ name: resultName, size: blob.size, blob, toolName: 'PDF to Word' })
    setProgress(100)
  }, [file, outputName, gatedDownload])

  const convertToText = useCallback(async () => {
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
    setResult({ name: resultName, size: blob.size, blob, toolName: 'PDF to Text' })
    setProgress(100)
    setPreview(fullText.split('\n').slice(0, 14).join('\n') || '(No text found)')
  }, [file, outputName, gatedDownload])

  const downloadAgain = useCallback(() => {
    if (!result) return
    gatedDownload(() => downloadBlob(result.blob, result.name), result.name, result.toolName)
  }, [result, gatedDownload])

  const convert = useCallback(async () => {
    if (!file) return
    setIsWorking(true)
    setErrors([])
    setResult(null)
    setProgress(10)
    try {
      if (format === 'docx') {
        await convertToWord()
      } else {
        await convertToText()
      }
    } catch (err) {
      setErrors([err.message || `Couldn't convert "${file.name}". It may be corrupted or not a valid PDF.`])
    }
    setIsWorking(false)
  }, [file, format, convertToWord, convertToText])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        {format === 'docx'
          ? 'Convert a PDF into an editable Word document, preserving text, font styling, and images.'
          : 'Pull the plain text out of a PDF, in reading order, as a .txt file.'}
      </p>

      {format === 'docx' ? (
        <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <p>
            <strong>Uploaded for conversion.</strong> Unlike most tools on this site, this one sends your PDF to
            Adobe's PDF Services API to produce the Word file, then deletes it from Adobe's servers. Files up to 4.5 MB.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <p>
            <strong>Text only, no formatting, stays on your device.</strong> No fonts, styling, images, or layout —
            just the words, in reading order. Scanned (image-only) PDFs won't have any extractable text.
          </p>
        </div>
      )}

      <Dropzone
        accept="application/pdf,.pdf"
        onFiles={handleFiles}
        hint={format === 'docx' ? 'One PDF at a time, up to 4.5 MB' : 'One PDF at a time'}
        privacyNote={format === 'docx' ? 'uploaded securely to convert' : 'nothing leaves your device'}
      />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && !result && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-panel p-4">
          <PdfThumbnail file={file} className="h-16 w-12 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-text-dim">Selected PDF</p>
          </div>
        </div>
      )}

      {isWorking && (
        <ProgressBar
          label={format === 'docx' ? 'Converting with Adobe PDF Services…' : 'Extracting text…'}
          progress={progress}
        />
      )}

      {result && file && (
        <ResultCard beforeName={file.name} beforeSize={file.size} afterName={result.name} afterSize={result.size} />
      )}

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
    [format, handleFiles, clearErrors, errors, file, isWorking, progress, result, preview]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          Output
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => changeFormat('docx')}
            className={[
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              format === 'docx' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim hover:text-text'
            ].join(' ')}
          >
            Word (.docx)
          </button>
          <button
            onClick={() => changeFormat('txt')}
            className={[
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              format === 'txt' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim hover:text-text'
            ].join(' ')}
          >
            Plain text (.txt)
          </button>
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
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {result ? 'Download again' : `Convert to .${format}`}
      </button>
    </>
    ),
    [convert, isWorking, file, outputName, format, changeFormat, result, downloadAgain]
  )

  return { workspace, settings }
}
