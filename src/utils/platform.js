import { saveAs } from 'file-saver'
import { Capacitor } from '@capacitor/core'
import { trackEvent } from './analytics.js'

/**
 * Platform adapter. The app is one React codebase that runs on web, iOS, and
 * Android (via Capacitor). Anything that must behave differently per platform
 * lives here so the tools never have to care where they're running.
 */

/** True when running inside the native iOS/Android shell, false on the web. */
export const isNative = Capacitor.isNativePlatform()

/** True in the Chrome extension build (`vite build --mode extension`). */
export const isExtension = import.meta.env.MODE === 'extension'

/**
 * Save a Blob to the user's device.
 *  - Web: triggers a normal browser download; on iOS, opens the share sheet
 *    instead (see queueIOSShare).
 *  - Native: writes the file to the device, then opens the native share sheet
 *    so the user can save it to Files/Photos or send it anywhere.
 */
/** True on iPhone/iPad (iPadOS reports itself as a Mac, hence the touch check). */
export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/*
 * iOS Safari only honors the first of several downloads fired from one tap,
 * and blob downloads from a home-screen (standalone) app open in a viewer with
 * no way back. So on iOS, every saveBlob call made in the same tick is
 * batched into a single Web Share sheet ("Save to Files" / "Save Image"),
 * which handles any number of files. The flush runs in a microtask, so it
 * still counts as part of the user's tap (share requires a user gesture).
 */
let shareQueue = null

function queueIOSShare(blob, filename) {
  if (!shareQueue) {
    shareQueue = []
    queueMicrotask(flushIOSShare)
  }
  shareQueue.push({ blob, filename })
}

async function flushIOSShare() {
  const batch = shareQueue
  shareQueue = null
  const files = batch.map(({ blob, filename }) => new File([blob], filename, { type: blob.type || 'application/octet-stream' }))
  try {
    await navigator.share({ files })
  } catch (err) {
    if (err && err.name === 'AbortError') return // user closed the sheet
    // Share refused (e.g. tap activation expired) — fall back to plain downloads.
    batch.forEach(({ blob, filename }) => saveAs(blob, filename))
  }
}

function canShareFiles(blob, filename) {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([blob], filename, { type: blob.type || 'application/octet-stream' })] })
    )
  } catch {
    return false
  }
}

export async function saveBlob(blob, filename) {
  trackEvent('download')
  if (!isNative) {
    if (isIOS && canShareFiles(blob, filename)) queueIOSShare(blob, filename)
    else saveAs(blob, filename)
    return
  }

  // Load native-only plugins lazily so the web bundle never pulls them in.
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])

  const base64 = await blobToBase64(blob)

  // Cache dir is writable without permissions and is the right place for a
  // transient file we immediately hand off to the share sheet.
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  })

  try {
    await Share.share({
      title: filename,
      url: uri,
      dialogTitle: 'Save or share your file',
    })
  } catch (err) {
    // The user dismissing the share sheet throws; that's not a real error.
    if (!isShareCanceled(err)) throw err
  }
}

/** Read a Blob as a base64 string (no data: prefix), as required by Filesystem. */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // result is "data:<mime>;base64,XXXX" — strip everything up to the comma.
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.onerror = () => reject(new Error('Could not read the file for saving.'))
    reader.readAsDataURL(blob)
  })
}

function isShareCanceled(err) {
  const msg = (err && (err.message || String(err))) || ''
  return /cancel/i.test(msg)
}
