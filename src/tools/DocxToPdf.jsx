import { useState, useCallback, useMemo } from 'react'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { validateFiles, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { convertDocxToPdf } from '../utils/docxToPdf.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

const ACCEPT = ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export default function useDocxToPdf() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ACCEPT })
    setErrors(fileErrors)
    if (valid.length > 0) {
      setFile(valid[0])
      setOutputName(`${stripExtension(valid[0].name)}-converted.pdf`)
      setResult(null)
    }
  }, [])

  const convert = useCallback(async () => {
    if (!file) return
    setIsWorking(true)
    setErrors([])
    setResult(null)
    setProgress(0)
    try {
      const blob = await convertDocxToPdf(file, (f) => setProgress(f * 100))
      const trimmedName = outputName.trim() || stripExtension(file.name)
      const resultName = trimmedName.endsWith('.pdf') ? trimmedName : `${trimmedName}.pdf`
      gatedDownload(() => downloadBlob(blob, resultName), resultName, 'Word to PDF')
      setResult({ name: resultName, size: blob.size, blob })
    } catch (err) {
      setErrors([err.message || `Couldn't convert "${file.name}". It may be corrupted or not a valid .docx file.`])
    }
    setIsWorking(false)
  }, [file, outputName, gatedDownload])

  const downloadAgain = useCallback(() => {
    if (!result) return
    gatedDownload(() => downloadBlob(result.blob, result.name), result.name, 'Word to PDF')
  }, [result, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Convert a Word document into a PDF, right in your browser.
      </p>

      <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
        <p>
          <strong>Close, not pixel-perfect.</strong> Text, headings, lists, tables, and images are
          reconstructed from the document and laid out on A4 pages. Complex layouts (columns, headers/footers,
          precise positioning) are approximated.
        </p>
      </div>

      <Dropzone accept=".docx" onFiles={handleFiles} hint="One .docx file at a time" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && !result && (
        <div className="rounded-card border border-border bg-panel p-4">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-text-dim">Selected Word document</p>
        </div>
      )}

      {isWorking && <ProgressBar label="Building PDF…" progress={progress} />}

      {result && file && (
        <ResultCard beforeName={file.name} beforeSize={file.size} afterName={result.name} afterSize={result.size} />
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, file, isWorking, progress, result]
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
        onClick={result ? downloadAgain : convert}
        disabled={isWorking || !file}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {result ? 'Download again' : 'Convert to .pdf'}
      </button>
    </>
    ),
    [convert, isWorking, file, outputName, result, downloadAgain]
  )

  return { workspace, settings }
}
