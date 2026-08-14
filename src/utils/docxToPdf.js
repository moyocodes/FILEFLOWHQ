import { jsPDF } from 'jspdf'
import mammoth from 'mammoth'

const PAGE_WIDTH_PT = 595.28 // A4
const PAGE_HEIGHT_PT = 841.89
const MARGIN_PT = 56 // ~0.78in

/**
 * Convert a .docx File into a PDF Blob.
 *
 * Runs entirely client-side: mammoth parses the docx XML into HTML (text,
 * basic styling, lists, tables, images), then jsPDF's html() renderer
 * (backed by html2canvas) paints and paginates that HTML onto A4 pages.
 * Complex Word layout (columns, precise positioning, headers/footers) isn't
 * reproduced — this matches the "close, not pixel-perfect" approach used by
 * the PDF to Word tool for the reverse conversion.
 *
 * @param {File} file  a .docx file
 * @param {(fraction:number)=>void} [onProgress]  0..1 progress callback
 * @returns {Promise<Blob>}
 */
export async function convertDocxToPdf(file, onProgress) {
  const buffer = await file.arrayBuffer()
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer })
  onProgress?.(0.3)

  if (!html.trim()) {
    throw new Error('No content could be extracted from this document.')
  }

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.cssText = `
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  `
  // Laid out at its natural on-screen position (0,0) so html2canvas measures
  // real geometry — jsPDF's html() renderer reads live DOM bounding-client-rect
  // coordinates (not just canvas pixels) to place text, so pushing this element
  // far off-screen (e.g. left: -99999px) bakes that offset into the PDF's text
  // positions. Sit behind the app UI instead, so nothing is visibly disturbed.
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.zIndex = '-1'
  container.style.width = `${PAGE_WIDTH_PT - MARGIN_PT * 2}pt`
  document.body.appendChild(container)

  // Tailwind's preflight reset strips default margins, list bullets, and
  // heading font-weight/size app-wide, so those must be restored explicitly
  // here rather than relying on the browser's normal UA stylesheet.
  const style = document.createElement('style')
  style.textContent = `
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 0.6em; }
    td, th { border: 1px solid #999; padding: 4pt 6pt; text-align: left; }
    h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 0.6em 0 0.3em; }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    p { margin: 0 0 0.6em; }
    ul, ol { margin: 0 0 0.6em; padding-left: 1.5em; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin-bottom: 0.2em; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
  `
  container.prepend(style)

  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    await new Promise((resolve, reject) => {
      doc.html(container, {
        callback: resolve,
        margin: [MARGIN_PT, MARGIN_PT, MARGIN_PT, MARGIN_PT],
        // 'slice' paginates from the rendered canvas raster; 'text' instead
        // reads live DOM Range.getBoundingClientRect() positions, which pick
        // up the container's off-screen offset and place text off the page.
        autoPaging: 'slice',
        width: PAGE_WIDTH_PT - MARGIN_PT * 2,
        windowWidth: container.offsetWidth,
        html2canvas: { scale: 0.75 },
      }).catch(reject)
    })
    onProgress?.(1)
    return doc.output('blob')
  } finally {
    document.body.removeChild(container)
  }
}
