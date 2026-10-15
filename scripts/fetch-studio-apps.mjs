/**
 * Downloads the pinned web build of every Studio editor (src/studioApps.js)
 * from GitHub Releases and unpacks it into .studio-cache/<id>/<version>/.
 * Already-cached versions are skipped, so re-runs are instant.
 *
 *   node scripts/fetch-studio-apps.mjs                       # fill the cache (dev server reads it)
 *   node scripts/fetch-studio-apps.mjs --out dist/studio-apps  # also copy into the build
 *
 * Each app's index.html is written as app.html: Vercel's cleanUrls serves it at
 * /studio-apps/<id>/<version>/app, so the app's relative asset URLs resolve inside its folder.
 * The version in the path lets every file be cached forever.
 * The upstream LICENSE-* and NOTICE files are kept next to the app, as the
 * MIT/Apache-2.0 licenses require.
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir, writeFile, readFile, rm, cp, access, readdir, rename } from 'node:fs/promises'
import JSZip from 'jszip'
import { studioApps, releaseZipUrl } from '../src/studioApps.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, '.studio-cache')

const outArg = process.argv.indexOf('--out')
const OUT = outArg === -1 ? null : join(ROOT, process.argv[outArg + 1])

const exists = (p) => access(p).then(() => true, () => false)

async function fetchApp(app) {
  // Our own rebranded build, committed under studio-builds/<id>/ (see studio/README.md).
  if (app.branded) {
    const dir = join(ROOT, 'studio-builds', app.id)
    if (!(await exists(join(dir, 'app.html')))) throw new Error(`${app.id}: no app.html in studio-builds/${app.id}`)
    return dir
  }

  const dir = join(CACHE, app.id, app.version)
  if (await exists(join(dir, 'app.html'))) return dir

  const url = releaseZipUrl(app)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${app.id}: ${res.status} ${res.statusText} for ${url}`)
  const zip = await JSZip.loadAsync(await res.arrayBuffer())

  // Unpack to a temp dir, then rename, so an interrupted run never looks cached.
  const tmp = `${dir}.tmp`
  await rm(tmp, { recursive: true, force: true })
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    // Strip the zip's top-level "<repo>-web-<version>/" folder.
    const rel = entry.name.split('/').slice(1).join('/')
    if (!rel || rel.includes('..')) continue
    // Precompressed copies (.br/.gz): Vercel compresses on the fly and never serves these.
    if (/\.(br|gz)$/.test(rel)) continue
    const target = join(tmp, rel === 'index.html' ? 'app.html' : rel)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await entry.async('nodebuffer'))
  }
  if (!(await exists(join(tmp, 'app.html')))) throw new Error(`${app.id}: no index.html in ${url}`)

  // Drop older cached versions of this app.
  await mkdir(join(CACHE, app.id), { recursive: true })
  for (const old of await readdir(join(CACHE, app.id))) {
    if (old !== `${app.version}.tmp`) await rm(join(CACHE, app.id, old), { recursive: true, force: true })
  }
  await rename(tmp, dir)
  console.log(`[studio] fetched ${app.id} v${app.version}`)
  return dir
}

/** Our name in the browser tab (seen on "Full screen"); idempotent, so it also updates cached copies. */
async function brandTitle(app, dir) {
  const file = join(dir, 'app.html')
  const html = await readFile(file, 'utf8')
  const branded = html.replace(/<title>[^<]*<\/title>/, `<title>${app.name} — FileFlowHQ Studio</title>`)
  if (branded !== html) await writeFile(file, branded)
}

async function run() {
  // A few at a time: the archives are 5–65 MB each.
  const dirs = new Map()
  const queue = [...studioApps]
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let app; (app = queue.shift()); ) {
        const dir = await fetchApp(app)
        await brandTitle(app, dir)
        dirs.set(app.id, dir)
      }
    })
  )

  if (OUT) {
    await rm(OUT, { recursive: true, force: true })
    for (const app of studioApps) await cp(dirs.get(app.id), join(OUT, app.id, app.version), { recursive: true })
    console.log(`[studio] copied ${studioApps.length} editors to ${OUT.replace(ROOT + '/', '')}`)
  } else {
    console.log(`[studio] ${studioApps.length} editors ready in .studio-cache`)
  }
}

run().catch((err) => {
  console.error('[studio] failed:', err)
  process.exit(1)
})
