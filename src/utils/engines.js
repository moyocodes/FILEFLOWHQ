/**
 * The Studio engines behind the converter tools: the editors' own Rust processors (pdfcraft,
 * wordcraft, photocraft, gridcraft) built headless to WebAssembly by engines/build.sh and
 * served from public/engines/. They run in a worker on the user's device — nothing is uploaded.
 * Each engine downloads once, then the browser caches it.
 */

export const ENGINES = {
  // pdfcraft: PDF → Word, PowerPoint, HTML, RTF.
  pdf: { version: '0.1.0', size: '2.6 MB' },
  // wordcraft: Word, ODT, RTF, Markdown, HTML, text → PDF (and between them), with real page layout.
  word: { version: '0.1.0', size: '5 MB' },
  // photocraft: images in (HEIC, RAW, PSD, TIFF, EXR, …) and out (PNG, JPEG, WebP, TIFF, PSD, GIF, BMP).
  image: { version: '0.1.0', size: '3.8 MB' },
}

let worker
let nextId = 0
const pending = new Map()

function getWorker() {
  if (worker) return worker
  worker = new Worker('/engines/worker.js', { type: 'module' })
  worker.onmessage = ({ data: { id, result, error } }) => {
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (error) p.reject(new Error(error))
    else p.resolve(result)
  }
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'The engine stopped unexpectedly.'))
    pending.clear()
    worker.terminate()
    worker = null
  }
  return worker
}

/** Call `fn(...args)` in an engine. Byte arrays are copied to the worker. */
export function runEngine(engine, fn, ...args) {
  const { version } = ENGINES[engine]
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, engine, version, fn, args })
  })
}

/** Engines need module workers and WebAssembly (every current browser). */
export const enginesSupported = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
