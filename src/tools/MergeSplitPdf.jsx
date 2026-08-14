import { useState, useCallback, useMemo } from 'react'
import { PDFDocument } from 'pdf-lib'
import { GripVertical } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import PdfThumbnail from '../components/PdfThumbnail.jsx'
import { validateFiles, readAsArrayBuffer, downloadBlob, formatBytes, uid } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

/**
 * Merge/Split PDF has two sub-modes with entirely different state, so the
 * mode switch itself lives in this outer hook and each mode's logic is
 * broken into its own inner hook (useMergePanel / useSplitPanel), mirroring
 * the original MergePanel/SplitPanel sub-components.
 */
export default function useMergeSplitPdf() {
  const [mode, setMode] = useState('merge') // 'merge' | 'split'

  const merge = useMergePanel()
  const split = useSplitPanel()
  const active = mode === 'merge' ? merge : split

  const modeSwitcher = useMemo(
    () => (
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode('merge')}
          className={[
            'rounded px-4 py-2 text-sm font-medium',
            mode === 'merge' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'
          ].join(' ')}
        >
          Merge PDFs
        </button>
        <button
          onClick={() => setMode('split')}
          className={[
            'rounded px-4 py-2 text-sm font-medium',
            mode === 'split' ? 'bg-signal text-void' : 'bg-panel-raised text-text-dim'
          ].join(' ')}
        >
          Split / extract pages
        </button>
      </div>
    ),
    [mode]
  )

  const workspace = useMemo(
    () => (
      <div className="space-y-6">
        <p className="text-sm text-text-dim">
          Combine several PDFs into one, or pull a page range out of a single PDF.
        </p>
        {modeSwitcher}
        {active.workspace}
      </div>
    ),
    [modeSwitcher, active.workspace]
  )

  const settings = active.settings

  return { workspace, settings }
}

function useMergePanel() {
  const { gatedDownload } = useEmailGate()
  const [items, setItems] = useState([])
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragIndex, setDragIndex] = useState(null)
  const [outputName, setOutputName] = useState('merged.pdf')

  const handleFiles = useCallback((files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    setItems((prev) => [...prev, ...valid.map((file) => ({ id: uid(), file }))])
  }, [])

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [])
  const reorder = useCallback((from, to) => {
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const merge = useCallback(async () => {
    if (items.length < 2) {
      setErrors(['Add at least two PDFs to merge.'])
      return
    }
    setIsWorking(true)
    setErrors([])
    try {
      const outDoc = await PDFDocument.create()
      for (let i = 0; i < items.length; i++) {
        const buffer = await readAsArrayBuffer(items[i].file)
        const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
        const copiedPages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices())
        copiedPages.forEach((p) => outDoc.addPage(p))
        setProgress(((i + 1) / items.length) * 100)
      }
      const bytes = await outDoc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const name = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`
      gatedDownload(() => downloadBlob(blob, name), name, 'Merge PDF')
    } catch (err) {
      setErrors(['One of the selected files could not be read as a PDF. It may be corrupted or encrypted.'])
    }
    setIsWorking(false)
  }, [items, outputName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <>
      <Dropzone accept="application/pdf,.pdf" multiple onFiles={handleFiles} hint="Two or more PDFs" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {isWorking && <ProgressBar label="Merging…" progress={progress} />}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index)
                setDragIndex(null)
              }}
              className="flex items-center gap-3 rounded-lg border border-border bg-panel px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-text-dim" strokeWidth={2} />
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-signal-dim font-mono text-[11px] font-medium text-signal">
                {index + 1}
              </span>
              <PdfThumbnail file={item.file} className="h-10 w-8 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-text-dim">{formatBytes(item.file.size)}</p>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-xs text-text-dim hover:text-red-500">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
    ),
    [handleFiles, clearErrors, errors, isWorking, progress, items, dragIndex, reorder, removeItem]
  )

  const settings = useMemo(
    () => (
    <>
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

      <button
        onClick={merge}
        disabled={isWorking || items.length < 2}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Merge {items.length} PDFs
      </button>
    </>
    ),
    [outputName, merge, isWorking, items.length]
  )

  return { workspace, settings }
}

function useSplitPanel() {
  const { gatedDownload } = useEmailGate()
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(null)
  const [start, setStart] = useState(1)
  const [end, setEnd] = useState(1)
  const [outputName, setOutputName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)
  const [errors, setErrors] = useState([])
  const [isWorking, setIsWorking] = useState(false)

  const handleFiles = useCallback(async (files) => {
    const { valid, errors: fileErrors } = validateFiles(files, { accept: ['.pdf', 'application/pdf'] })
    setErrors(fileErrors)
    if (valid.length === 0) return
    const chosen = valid[0]
    try {
      const buffer = await readAsArrayBuffer(chosen)
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      setFile(chosen)
      setPageCount(doc.getPageCount())
      setStart(1)
      setEnd(doc.getPageCount())
      setOutputName(`pages-1-${doc.getPageCount()}.pdf`)
      setNameEdited(false)
    } catch {
      setErrors([`Couldn't read "${chosen.name}". It may be corrupted or encrypted.`])
    }
  }, [])

  const updateStart = useCallback(
    (value) => {
      setStart(value)
      if (!nameEdited) setOutputName(`pages-${value}-${end}.pdf`)
    },
    [end, nameEdited]
  )

  const updateEnd = useCallback(
    (value) => {
      setEnd(value)
      if (!nameEdited) setOutputName(`pages-${start}-${value}.pdf`)
    },
    [start, nameEdited]
  )

  const split = useCallback(async () => {
    if (!file) return
    const s = Math.max(1, Math.min(start, pageCount))
    const e = Math.max(s, Math.min(end, pageCount))
    setIsWorking(true)
    setErrors([])
    try {
      const buffer = await readAsArrayBuffer(file)
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const outDoc = await PDFDocument.create()
      const indices = []
      for (let p = s; p <= e; p++) indices.push(p - 1)
      const copiedPages = await outDoc.copyPages(srcDoc, indices)
      copiedPages.forEach((p) => outDoc.addPage(p))
      const bytes = await outDoc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const trimmedName = outputName.trim() || `pages-${s}-${e}.pdf`
      const name = trimmedName.endsWith('.pdf') ? trimmedName : `${trimmedName}.pdf`
      gatedDownload(() => downloadBlob(blob, name), name, 'Split PDF')
    } catch {
      setErrors(['Something went wrong while extracting those pages.'])
    }
    setIsWorking(false)
  }, [file, start, end, pageCount, outputName, gatedDownload])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <>
      <Dropzone accept="application/pdf,.pdf" onFiles={handleFiles} hint="One PDF at a time" />
      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      {isWorking && <ProgressBar label="Extracting pages…" />}

      {file && pageCount && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-panel p-4">
          <PdfThumbnail file={file} className="h-16 w-12 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-text-dim">{pageCount} pages</p>
          </div>
        </div>
      )}
    </>
    ),
    [handleFiles, clearErrors, errors, isWorking, file, pageCount]
  )

  const settings = useMemo(
    () => (
    <>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          From page
        </label>
        <input
          type="number"
          min={1}
          max={pageCount || 1}
          value={start}
          disabled={!pageCount}
          onChange={(e) => updateStart(Number(e.target.value))}
          className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>
      <div className="field">
        <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
          To page
        </label>
        <input
          type="number"
          min={1}
          max={pageCount || 1}
          value={end}
          disabled={!pageCount}
          onChange={(e) => updateEnd(Number(e.target.value))}
          className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>

      {file && (
        <div className="field">
          <label className="mb-2.5 block font-mono text-[0.64rem] uppercase tracking-[0.08em] text-text-dim">
            File name
          </label>
          <input
            value={outputName}
            onChange={(e) => {
              setOutputName(e.target.value)
              setNameEdited(true)
            }}
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
      )}

      <button
        onClick={split}
        disabled={isWorking || !file}
        className="mt-auto w-full flex-shrink-0 rounded bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Extract pages
      </button>
    </>
    ),
    [start, end, pageCount, outputName, updateStart, updateEnd, split, isWorking, file]
  )

  return { workspace, settings }
}
