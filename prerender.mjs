/**
 * Post-build prerender: renders each route with a headless browser and writes
 * the fully-rendered HTML to dist/<route>/index.html. This gives search engines
 * (and social scrapers) complete, keyword-rich HTML — including the per-page
 * FAQ JSON-LD — without relying on client-side JS execution.
 *
 * Targets the WEB build only (BrowserRouter). It is resilient by design: if a
 * headless browser can't launch (e.g. a restricted CI/Vercel environment), it
 * logs a warning and exits 0 so the deploy still succeeds with the normal SPA.
 *
 * Run automatically after `vite build` via the "build" script.
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = 4319

// Keep this list derived from the same source of truth the app uses.
async function getRoutes() {
  const cfg = await readFile(join(__dirname, 'src/toolsConfig.js'), 'utf8')
  const paths = [...cfg.matchAll(/path:\s*'(\/tools\/[^']+)'/g)].map((m) => m[1])
  return ['/', '/privacy', '/contact', ...paths]
}

async function run() {
  const routes = await getRoutes()

  // Serve the built dist/ as a static site so BrowserRouter routes resolve.
  const server = await createServer({
    configFile: false,
    root: DIST,
    server: { port: PORT },
    preview: { port: PORT },
    appType: 'spa',
  })
  await server.listen()

  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    console.warn('[prerender] puppeteer not installed — skipping prerender.')
    await server.close()
    return
  }

  let browser
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  } catch (err) {
    console.warn('[prerender] could not launch headless browser — skipping prerender.')
    console.warn('           ', err.message)
    await server.close()
    return
  }

  for (const route of routes) {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0' })
    // Ensure the route's SEO content (h1/FAQ) has been rendered before capture.
    await page.waitForSelector('#root h1', { timeout: 10000 }).catch(() => {})
    const html = '<!doctype html>\n' + (await page.content()).replace(/^<!doctype html>/i, '')
    await page.close()

    const outDir = route === '/' ? DIST : join(DIST, route)
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'index.html'), html, 'utf8')
    console.log(`[prerender] ${route} -> ${join(outDir.replace(DIST, 'dist'), 'index.html')}`)
  }

  await browser.close()
  await server.close()
  console.log(`[prerender] done — ${routes.length} routes.`)
}

run().catch((err) => {
  console.warn('[prerender] failed, continuing without prerender:', err.message)
  process.exit(0)
})
