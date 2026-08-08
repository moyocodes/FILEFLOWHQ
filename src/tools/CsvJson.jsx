import { useState, useCallback, useMemo } from 'react'
import { Download, Copy, ArrowLeftRight } from 'lucide-react'
import Dropzone from '../components/Dropzone.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { validateFiles, readAsText, downloadBlob, stripExtension } from '../utils/fileHelpers.js'
import { useEmailGate } from '../context/EmailGateContext.jsx'

/** Minimal RFC-4180-ish CSV parser that handles quoted fields and commas/newlines inside quotes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

function csvToJson(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) throw new Error('That CSV appears to be empty.')
  const [header, ...body] = rows
  return body.map((r) => {
    const obj = {}
    header.forEach((key, i) => {
      obj[key.trim() || `column_${i + 1}`] = r[i] ?? ''
    })
    return obj
  })
}

function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function jsonToCsv(text) {
  let data = JSON.parse(text)
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) data = [data]
    else throw new Error('JSON must be an array of objects (or a single object).')
  }
  if (data.length === 0) return ''

  const headerSet = new Set()
  data.forEach((row) => {
    if (typeof row === 'object' && row !== null) Object.keys(row).forEach((k) => headerSet.add(k))
  })
  const headers = Array.from(headerSet)
  const lines = [headers.map(escapeCsvField).join(',')]
  data.forEach((row) => {
    lines.push(headers.map((h) => escapeCsvField(row?.[h])).join(','))
  })
  return lines.join('\n')
}

export default function useCsvJson() {
  const { gatedDownload } = useEmailGate()
  const [direction, setDirection] = useState('csv-to-json') // 'csv-to-json' | 'json-to-csv'
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [outputName, setOutputName] = useState('converted')
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(false)

  const accept = direction === 'csv-to-json' ? ['.csv', 'text/csv'] : ['.json', 'application/json']

  const runConvert = useCallback(
    (sourceText) => {
      const text = sourceText ?? input
      setErrors([])
      setOutput('')
      if (!text.trim()) {
        setErrors(['Paste some data or upload a file first.'])
        return
      }
      try {
        if (direction === 'csv-to-json') {
          setOutput(JSON.stringify(csvToJson(text), null, 2))
        } else {
          setOutput(jsonToCsv(text))
        }
      } catch (err) {
        setErrors([`Couldn't convert that: ${err.message}`])
      }
    },
    [input, direction]
  )

  const handleFiles = useCallback(
    async (files) => {
      const { valid, errors: fileErrors } = validateFiles(files, { accept })
      setErrors(fileErrors)
      if (valid.length === 0) return
      try {
        const text = await readAsText(valid[0])
        setInput(text)
        setOutputName(stripExtension(valid[0].name))
        runConvert(text)
      } catch (err) {
        setErrors((prev) => [...prev, err.message])
      }
    },
    [accept, runConvert]
  )

  const swapDirection = useCallback(() => {
    setDirection((d) => (d === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json'))
    setInput('')
    setOutput('')
    setErrors([])
  }, [])

  const download = useCallback(() => {
    if (!output) return
    const ext = direction === 'csv-to-json' ? 'json' : 'csv'
    const type = direction === 'csv-to-json' ? 'application/json' : 'text/csv'
    const blob = new Blob([output], { type })
    const trimmedName = outputName.trim() || 'converted'
    const filename = trimmedName.endsWith(`.${ext}`) ? trimmedName : `${trimmedName}.${ext}`
    gatedDownload(() => downloadBlob(blob, filename), filename, 'CSV ⇄ JSON')
  }, [output, direction, outputName, gatedDownload])

  const copy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  const clearErrors = useCallback(() => setErrors([]), [])

  const workspace = useMemo(
    () => (
    <div className="space-y-6">
      <p className="text-sm text-text-dim">
        Convert tabular CSV data to JSON, or JSON back to CSV. Paste data directly or upload a file.
      </p>

      <div className="flex items-center gap-3">
        <span className={['text-sm font-medium', direction === 'csv-to-json' ? 'text-signal' : 'text-text-dim'].join(' ')}>
          CSV
        </span>
        <button
          onClick={swapDirection}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-dim hover:border-signal hover:text-signal"
          aria-label="Swap direction"
        >
          <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className={['text-sm font-medium', direction === 'json-to-csv' ? 'text-signal' : 'text-text-dim'].join(' ')}>
          JSON
        </span>
      </div>

      <Dropzone
        accept={direction === 'csv-to-json' ? '.csv,text/csv' : '.json,application/json'}
        onFiles={handleFiles}
        hint={direction === 'csv-to-json' ? '.csv file' : '.json file'}
      />

      <ErrorBanner messages={errors} onDismiss={clearErrors} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
            {direction === 'csv-to-json' ? 'CSV input' : 'JSON input'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={direction === 'csv-to-json' ? 'name,age\nAda,30\nGrace,32' : '[{ "name": "Ada", "age": 30 }]'}
            rows={12}
            className="scrollbar-thin w-full resize-y rounded-card border border-border bg-transparent p-3 font-mono text-xs leading-relaxed"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-xs font-medium uppercase tracking-wide text-text-dim">
            {direction === 'csv-to-json' ? 'JSON output' : 'CSV output'}
          </label>
          <textarea
            value={output}
            readOnly
            rows={12}
            placeholder="Converted output will appear here"
            className="scrollbar-thin w-full resize-y rounded-card border border-border bg-panel-raised p-3 font-mono text-xs leading-relaxed"
          />
        </div>
      </div>
    </div>
    ),
    [direction, swapDirection, handleFiles, errors, clearErrors, input, output]
  )

  const settings = useMemo(
    () => (
    <>
      <button
        onClick={() => runConvert()}
        className="rounded bg-signal px-4 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90"
      >
        Convert
      </button>

      {output && (
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
        onClick={download}
        disabled={!output}
        className="flex items-center justify-center gap-1.5 rounded border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2} />
        Download
      </button>
      <button
        onClick={copy}
        disabled={!output}
        className="mt-auto flex flex-shrink-0 items-center justify-center gap-1.5 rounded border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </>
    ),
    [runConvert, download, output, outputName, copy, copied]
  )

  return { workspace, settings }
}
