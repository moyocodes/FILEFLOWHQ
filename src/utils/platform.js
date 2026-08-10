import { saveAs } from 'file-saver'
import { Capacitor } from '@capacitor/core'

/**
 * Platform adapter. The app is one React codebase that runs on web, iOS, and
 * Android (via Capacitor). Anything that must behave differently per platform
 * lives here so the tools never have to care where they're running.
 */

/** True when running inside the native iOS/Android shell, false on the web. */
export const isNative = Capacitor.isNativePlatform()

/**
 * Save a Blob to the user's device.
 *  - Web: triggers a normal browser download (unchanged behavior).
 *  - Native: writes the file to the device, then opens the native share sheet
 *    so the user can save it to Files/Photos or send it anywhere.
 */
export async function saveBlob(blob, filename) {
  if (!isNative) {
    saveAs(blob, filename)
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
