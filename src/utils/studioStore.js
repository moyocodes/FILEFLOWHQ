/**
 * Keeps a Studio editor's open documents in this browser (IndexedDB), so a reload or a later
 * visit reopens them. Only this device ever sees them. Every call fails quietly: private
 * windows and blocked storage just mean nothing is kept.
 */
const DB = 'fileflowhq-studio'
const STORE = 'documents'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req?.result)
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Replace the kept documents of editor `appId` with `docs` ([{ name, bytes: ArrayBuffer }]). */
export async function keepDocuments(appId, docs) {
  try {
    await run('readwrite', (store) => (docs.length ? store.put({ docs, at: Date.now() }, appId) : store.delete(appId)))
  } catch {
    // storage unavailable or full: nothing kept
  }
}

/** The documents kept for editor `appId`, or []. */
export async function keptDocuments(appId) {
  try {
    const entry = await run('readonly', (store) => store.get(appId))
    return Array.isArray(entry?.docs) ? entry.docs : []
  } catch {
    return []
  }
}

/**
 * Files the visitor saved in editor `appId` (Save keeps them in this browser; only Export
 * downloads). [{ name, bytes: ArrayBuffer, at }], newest first.
 */
export async function savedFiles(appId) {
  try {
    const entry = await run('readonly', (store) => store.get(`saved:${appId}`))
    return Array.isArray(entry) ? entry.sort((a, b) => b.at - a.at) : []
  } catch {
    return []
  }
}

/** How many files each editor keeps in the browser. */
export const MAX_SAVED_FILES = 5

/**
 * Keep `bytes` as `name` in editor `appId`, replacing an earlier save of the same name. A new
 * name when MAX_SAVED_FILES are already kept is refused (`error.code === 'limit'`).
 */
export async function saveFile(appId, name, bytes) {
  const all = await savedFiles(appId)
  if (all.length >= MAX_SAVED_FILES && !all.some((f) => f.name === name)) {
    throw Object.assign(new Error('too many saved files'), { code: 'limit' })
  }
  const files = all.filter((f) => f.name !== name)
  await run('readwrite', (store) => store.put([{ name, bytes, at: Date.now() }, ...files], `saved:${appId}`))
  window.dispatchEvent(new CustomEvent('ffhq:saved-changed', { detail: appId }))
}

/** Forget the saved file `name` of editor `appId`. */
export async function removeSavedFile(appId, name) {
  try {
    const files = (await savedFiles(appId)).filter((f) => f.name !== name)
    await run('readwrite', (store) => store.put(files, `saved:${appId}`))
  } catch {
    // storage unavailable: nothing to remove
  }
  window.dispatchEvent(new CustomEvent('ffhq:saved-changed', { detail: appId }))
}
