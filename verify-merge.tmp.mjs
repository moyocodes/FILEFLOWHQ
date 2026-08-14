import puppeteer from 'puppeteer'
const SCRATCH = '/private/tmp/claude-501/-Users-tizetimoyosore-Developer-file-convert-hub/f163fae4-e865-40d3-8b8c-dc9d6c304b9b/scratchpad'
const PDF_PATH = '/Users/tizetimoyosore/Developer/file-convert-hub/public/26 Jan 2026-Statement.pdf'

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
page.on('pageerror', (err) => console.log('[page error]', err.message))
page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console error]', msg.text()) })

await page.goto('http://localhost:5173/tools/pdf-to-word', { waitUntil: 'networkidle0' })
await page.waitForSelector('h1')

const fileInput = await page.$('input[type="file"]')
await fileInput.uploadFile(PDF_PATH)
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: `${SCRATCH}/merge-01-docx-mode.png` })

// switch to plain text mode
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Plain text (.txt)')
  btn?.click()
})
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: `${SCRATCH}/merge-02-txt-mode.png` })

// convert in txt mode (local, no network needed)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /^Convert to \.txt/.test(b.textContent.trim()))
  btn?.click()
})
try {
  await page.waitForFunction(() => [...document.querySelectorAll('p')].some((p) => p.textContent === 'Done'), { timeout: 15000 })
  console.log('txt conversion Done state appeared')
} catch {
  console.log('txt conversion did not finish in time')
}
await new Promise((r) => setTimeout(r, 500))
await page.screenshot({ path: `${SCRATCH}/merge-03-txt-result.png`, fullPage: true })

// old route redirect check
await page.goto('http://localhost:5173/tools/pdf-to-text', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 300))
console.log('URL after visiting old route:', page.url())

await browser.close()
console.log('DONE')
