import { saveBlob } from './platform'

/** Maximum file size accepted by default (per file), in bytes. 100 MB. */
export const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Human-readable byte formatting, e.g. 1536000 -> "1.5 MB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/**
 * Save a Blob to the device. On the web this is a browser download; inside the
 * native iOS/Android app it writes the file and opens the share sheet. See
 * platform.js — every tool goes through here, so all platforms stay in sync.
 */
export function downloadBlob(blob, filename) {
  return saveBlob(blob, filename)
}

/** Strip the extension off a filename, e.g. "photo.png" -> "photo" */
export function stripExtension(filename) {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? filename : filename.slice(0, idx)
}

export function getExtension(filename) {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase()
}

/** Reject files that are too large or the wrong type. Returns { valid, errors }. */
export function validateFiles(files, { accept, maxSize = MAX_FILE_SIZE } = {}) {
  const errors = []
  const valid = []

  for (const file of files) {
    if (maxSize && file.size > maxSize) {
      errors.push(`"${file.name}" is too large (${formatBytes(file.size)}). Max is ${formatBytes(maxSize)}.`)
      continue
    }
    if (accept && accept.length > 0) {
      const ext = getExtension(file.name)
      const typeMatches = accept.some((rule) => {
        if (rule.startsWith('.')) return `.${ext}` === rule.toLowerCase()
        if (rule.endsWith('/*')) return file.type.startsWith(rule.replace('/*', '/'))
        return file.type === rule
      })
      if (!typeMatches) {
        errors.push(`"${file.name}" isn't a supported file type for this tool.`)
        continue
      }
    }
    valid.push(file)
  }

  return { valid, errors }
}

/** Load a File/Blob into an HTMLImageElement, resolved once decoded. */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read "${file.name}". The file may be corrupted.`))
    }
    img.src = url
  })
}

/** Read a File as an ArrayBuffer via Promise. */
export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
    reader.readAsArrayBuffer(file)
  })
}

/** Read a File as text via Promise. */
export function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
    reader.readAsText(file)
  })
}

/** Draw an HTMLImageElement onto a canvas, optionally resized, and return a Blob. */
export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Conversion failed while encoding the image.'))
      },
      mimeType,
      quality
    )
  })
}

let idCounter = 0
export function uid() {
  idCounter += 1
  return `id-${Date.now()}-${idCounter}`
}
