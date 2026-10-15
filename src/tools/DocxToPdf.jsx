import { useState, useCallback, useMemo } from 'react'
import { Cpu } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { validateFiles, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'
import { usePreview } from '../context/PreviewContext.jsx'
import { runEngine, enginesSupported, ENGINES } from '../utils/engines.js'

// Everything the Studio Word engine (wordcraft) reads.
const EXTS = ['.docx', '.doc', '.odt', '.rtf', '.md', '.html', '.htm', '.txt']
const ACCEPT = [...EXTS, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

export default function useDocxToPdf() {
  const { gatedDownload } = useEmailGate()
  const { preview: showPreview } = usePreview()
  const [file, setFile] = useState(null)
  const [outputName, setOutputName] = useState('')
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
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
      if (!enginesSupported) throw new Error('This conversion needs a current browser (WebAssembly).')
      setStatus(`Loading the Studio Word engine (${ENGINES.word.size}, first time only)…`)
      setProgress(15)
      const slow = setTimeout(() => setStatus('Laying out pages with the Studio Word engine…'), 1500)
      const bytes = await runEngine('word', 'convert', new Uint8Array(await file.arrayBuffer()), file.name, 'pdf').finally(() => clearTimeout(slow))
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const trimmedName = outputName.trim() || stripExtension(file.name)
      const resultName = trimmedName.endsWith('.pdf') ? trimmedName : `${trimmedName}.pdf`
      showPreview({ blob: blob, name: resultName, onDownload: () => gatedDownload(() => downloadBlob(blob, resultName), resultName, 'Word to PDF') })
      setResult({ name: resultName, size: blob.size, blob })
    } catch (err) {
      setErrors([err.message || `Couldn't convert "${file.name}". It may be corrupted or not a supported document.`])
    }
    setIsWorking(false)
  }, [file, outputName, gatedDownload, showPreview])

  const downloadAgain = useCallback(() => {
    if (!result) return
    gatedDownload(() => downloadBlob(result.blob, result.name), result.name, 'Word to PDF')
  }, [result, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Convert a Word document (or .odt, .rtf, .md, .html, .txt) into a PDF, right in your browser.
      </p>

      <div className="flex items-start gap-2 rounded-card border border-signal-dim bg-signal-dim px-4 py-3 text-sm text-text">
        <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
        <p>
          <strong>Powered by the Studio Word engine.</strong> The same page layout as our Word Processor: fonts,
          headers and footers, columns, tables and images, on your document's own page size. It runs on your device
          and downloads once ({ENGINES.word.size}).
        </p>
      </div>

      <Dropzone accept={EXTS.join(',')} onFiles={handleFiles} hint="One document at a time: .docx, .doc, .odt, .rtf, .md, .html, .txt" privacyNote="nothing leaves your device" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {file && !result && (
        <div className="rounded-card border border-border bg-panel p-4">
          <p className="truncate text-sm font-normal">{file.name}</p>
          <p className="text-xs text-text-dim">Selected document</p>
        </div>
      )}

      {isWorking && <ProgressBar label={status} progress={progress} />}

      {result && file && (
        <ResultCard beforeName={file.name} beforeSize={file.size} afterName={result.name} afterSize={result.size} />
      )}
    </div>
    ),
    [handleFiles, clearErrors, errors, file, isWorking, progress, status, result]
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
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {result ? 'Download again' : 'Convert to .pdf'}
      </button>
    </>
    ),
    [convert, isWorking, file, outputName, result, downloadAgain]
  )

  return { workspace, settings }
}
