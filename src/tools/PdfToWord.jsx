import { useState, useCallback, useMemo } from 'react'
import { Info } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { validateFiles, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

// Matches the Vercel serverless function's request body ceiling (api/pdf-to-word.js).
const MAX_UPLOAD_SIZE = 4.5 * 1024 * 1024

export default function usePdfToWord() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, {
      accept: ['.pdf', 'application/pdf'],
      maxSize: MAX_UPLOAD_SIZE,
    })
    setErrors(fileErrors)
    if (valid.length > 0) {
      setFile(valid[0])
      setOutputName(`${stripExtension(valid[0].name)}.docx`)
    }
  }, [])

  const convert = useCallback(async () => {
    if (!file) return
    setIsWorking(true)
    setErrors([])
    setProgress(10)
    try {
      const response = await fetch('/api/pdf-to-word', {
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
      setProgress(100)
    } catch (err) {
      setErrors([err.message || `Couldn't convert "${file.name}". It may be corrupted or not a valid PDF.`])
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
          <strong>Uploaded for conversion.</strong> Unlike most tools on this site, this one sends your PDF to
          Adobe's PDF Services API to produce the Word file, then deletes it from Adobe's servers. Files up to 4.5 MB.
        </p>
      </div>

      <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time, up to 4.5 MB" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && (
        <div className="rounded-card border border-border bg-panel p-4">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-text-dim">Selected PDF</p>
        </div>
      )}

      {isWorking && <ProgressBar label="Converting with Adobe PDF Services…" progress={progress} />}
    </div>
    ),
    [handleFiles, clearErrors, errors, file, isWorking, progress]
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
