import pdfjsLib from './pdfjsSetup.js'

// pdf.js "device space" for getTextContent/getOperatorList is in CSS pixels
// at 96dpi, which equals points (1px = 1pt at scale 1). We use that directly
// as our point measurements, matching what the PDF author authored in.
function fontSizeFromTransform(transform) {
  // transform = [a, b, c, d, e, f]; the glyph height scale is the length of
  // the (c, d) vector, which is robust to rotation/skew, unlike using `d` alone.
  const [, , c, d] = transform
  return Math.hypot(c, d) || 1
}

function cleanFontFamily(name) {
  if (!name) return undefined
  // Real font names (e.g. "Helvetica-BoldOblique", "ABCDEF+Arial-BoldMT")
  // carry a subset tag prefix and style suffix we don't want in the family name.
  const withoutSubsetTag = name.replace(/^[A-Z]{6}\+/, '')
  const withoutStyleSuffix = withoutSubsetTag.replace(/[-,]?(Bold|Italic|Oblique|BoldItalic|MT|PS)+$/gi, '').trim()
  return withoutStyleSuffix || undefined
}

// Resolve the real font object (with .bold/.italic/.name) for each distinct
// fontName used on the page. getTextContent()'s own `styles` map only gives a
// generic CSS fallback family (e.g. "sans-serif") — the actual PostScript
// name and weight/style flags live on the font object in objs/commonObjs,
// which is only populated once an operator list has been requested.
async function resolveFontInfoByName(page, fontNames) {
  await page.getOperatorList()
  const infoByName = new Map()
  await Promise.all(
    Array.from(fontNames).map(async (fontName) => {
      const info = await resolvePageObject(page, fontName)
      infoByName.set(fontName, info)
    })
  )
  return infoByName
}

// Resolve a pdf.js image object (from page.objs/commonObjs) to PNG bytes via canvas.
async function imageObjectToPngBytes(imgData) {
  const { width, height } = imgData
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (imgData.bitmap) {
    ctx.drawImage(imgData.bitmap, 0, 0)
  } else if (imgData.data) {
    const rgba = new Uint8ClampedArray(width * height * 4)
    const src = imgData.data
    const channels = src.length / (width * height)
    if (channels === 4) {
      rgba.set(src)
    } else if (channels === 3) {
      for (let p = 0; p < width * height; p++) {
        rgba[p * 4] = src[p * 3]
        rgba[p * 4 + 1] = src[p * 3 + 1]
        rgba[p * 4 + 2] = src[p * 3 + 2]
        rgba[p * 4 + 3] = 255
      }
    } else if (channels === 1) {
      for (let p = 0; p < width * height; p++) {
        const v = src[p]
        rgba[p * 4] = v
        rgba[p * 4 + 1] = v
        rgba[p * 4 + 2] = v
        rgba[p * 4 + 3] = 255
      }
    } else {
      return null
    }
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  } else {
    return null
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return null
  return new Uint8Array(await blob.arrayBuffer())
}

function resolvePageObject(page, objId) {
  const source = objId.startsWith('g_') ? page.commonObjs : page.objs
  return new Promise((resolve) => {
    try {
      source.get(objId, resolve)
    } catch {
      resolve(null)
    }
  })
}

// Walk the operator list tracking the CTM so we know where + how large each
// painted image is, then resolve + decode each one to PNG bytes.
export async function extractPageImages(page, viewport) {
  const opList = await page.getOperatorList()
  const OPS = pdfjsLib.OPS
  const images = []

  // Matrix stack: each entry is a 2D affine transform [a,b,c,d,e,f].
  let stack = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const multiply = (m1, m2) => [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ]

  const pending = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]

    if (fn === OPS.save) {
      stack.push(ctm)
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ctm
    } else if (fn === OPS.transform) {
      ctm = multiply(args, ctm)
    } else if (fn === OPS.paintImageXObject) {
      const [objId, w, h] = args
      // CTM maps unit square [0,1]x[0,1] to the image's placement in page
      // space; the resulting scale vectors give width/height in points.
      const widthPt = Math.hypot(ctm[0], ctm[1])
      const heightPt = Math.hypot(ctm[2], ctm[3])
      // Page-space y grows upward; convert to top-down for reading order.
      const topY = viewport.height / (viewport.scale || 1) - ctm[5]
      pending.push({ objId, w, h, widthPt, heightPt, y: topY })
    } else if (fn === OPS.paintInlineImageXObject) {
      const inline = args[0]
      const widthPt = Math.hypot(ctm[0], ctm[1])
      const heightPt = Math.hypot(ctm[2], ctm[3])
      const topY = viewport.height / (viewport.scale || 1) - ctm[5]
      pending.push({ inlineData: inline, widthPt, heightPt, y: topY })
    }
  }

  for (const item of pending) {
    try {
      const imgData = item.inlineData || (await resolvePageObject(page, item.objId))
      if (!imgData) continue
      const png = await imageObjectToPngBytes(imgData)
      if (!png) continue
      images.push({ y: item.y, widthPt: item.widthPt, heightPt: item.heightPt, png })
    } catch {
      // Skip images we can't decode rather than failing the whole conversion.
    }
  }

  return images
}

// Cluster runs into left-to-right column bands by x-position before any
// y-sorting happens. PDFs have no column concept — a genuine two-column
// layout and a single-column layout with a wide first-line indent look
// identical from position data alone unless we require a real *gap* in the
// x-coverage of the page (not just "this run starts further right"), so we
// bucket by starting x, then only split into separate columns when there's
// a horizontal gap between buckets wide enough to not be normal word/tab
// spacing. Each column is later read fully top-to-bottom before moving to
// the next, matching how a person reads a multi-column page.
function clusterRunsIntoColumns(runs) {
  if (runs.length === 0) return [runs]

  const BUCKET_WIDTH = 24 // pt; coarse enough to absorb per-line indent jitter
  const MIN_COLUMN_GAP = 40 // pt; narrower gaps are word/tab spacing, not a column break

  const bucketed = new Map()
  for (const run of runs) {
    const bucket = Math.floor(run.x / BUCKET_WIDTH)
    if (!bucketed.has(bucket)) bucketed.set(bucket, [])
    bucketed.get(bucket).push(run)
  }

  const occupiedBuckets = Array.from(bucketed.keys()).sort((a, b) => a - b)
  if (occupiedBuckets.length === 0) return [runs]

  // Merge adjacent occupied buckets into column x-ranges, breaking the
  // range whenever consecutive occupied buckets are farther apart than the
  // minimum column gap.
  const ranges = []
  let rangeStart = occupiedBuckets[0]
  let rangeEnd = occupiedBuckets[0]
  for (let i = 1; i < occupiedBuckets.length; i++) {
    const gapPt = (occupiedBuckets[i] - rangeEnd) * BUCKET_WIDTH
    if (gapPt > MIN_COLUMN_GAP) {
      ranges.push([rangeStart, rangeEnd])
      rangeStart = occupiedBuckets[i]
    }
    rangeEnd = occupiedBuckets[i]
  }
  ranges.push([rangeStart, rangeEnd])

  // A run belongs to a column purely by which merged bucket-range contains
  // its own bucket — this keeps runs that started the clustering in a range
  // together even if a later, unrelated pass would bucket differently.
  const bucketToRangeIndex = new Map()
  ranges.forEach(([start, end], idx) => {
    for (let b = start; b <= end; b++) bucketToRangeIndex.set(b, idx)
  })

  const columns = ranges.map(() => [])
  for (const run of runs) {
    const bucket = Math.floor(run.x / BUCKET_WIDTH)
    const idx = bucketToRangeIndex.get(bucket) ?? 0
    columns[idx].push(run)
  }

  // A "column" that only covers a small vertical span (e.g. a single
  // right-aligned page number or date) isn't a real reading column — treat
  // the whole page as single-column rather than force an artificial split.
  const pageYSpan = Math.max(...runs.map((r) => r.y)) - Math.min(...runs.map((r) => r.y)) || 1
  const realColumns = columns.filter((col) => {
    if (col.length === 0) return false
    const ySpan = Math.max(...col.map((r) => r.y)) - Math.min(...col.map((r) => r.y))
    return ySpan > pageYSpan * 0.25
  })

  return realColumns.length >= 2 ? realColumns : [runs]
}

// Group an already-column-scoped, x/y-sorted run list into visual lines and
// mark paragraph starts. Shared by every column so multi-column pages get
// identical line/paragraph heuristics to single-column ones.
function groupRunsIntoLines(orderedRuns) {
  const lines = []
  let current = null
  for (const run of orderedRuns) {
    if (current && Math.abs(run.y - current.y) <= Math.max(2, current.maxSize * 0.35)) {
      current.runs.push(run)
      current.maxSize = Math.max(current.maxSize, run.sizePt)
      current.minX = Math.min(current.minX, run.x)
    } else {
      if (current) lines.push(current)
      current = { y: run.y, maxSize: run.sizePt, minX: run.x, runs: [run] }
    }
  }
  if (current) lines.push(current)

  // Each line's runs may arrive out of x-order for rotated/complex PDFs; sort defensively.
  lines.forEach((line) => line.runs.sort((a, b) => a.x - b.x))

  // Mark whether a line starts a new paragraph: the gap to the previous line
  // is noticeably larger than a normal line-to-line step, which usually
  // means a blank line or paragraph break in the source PDF.
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      lines[i].isParagraphStart = true
      continue
    }
    const prev = lines[i - 1]
    const gap = prev.y - lines[i].y
    const normalStep = prev.maxSize * 1.35
    lines[i].isParagraphStart = gap > normalStep * 1.6 || gap <= 0
  }

  return lines
}

// Extract every text line on a page, grouped by visual line and ordered by
// reading order (column-by-column, top-to-bottom within each column). Each
// line has { y, maxSize, minX, isParagraphStart, columnIndex, runs }, where
// each run has { text, x, y, sizePt, bold, italic, fontFamily }.
export async function extractPageLines(page) {
  const content = await page.getTextContent()
  const textItems = content.items.filter((item) => item.str && item.str.trim().length > 0)

  const fontInfoByName = await resolveFontInfoByName(page, new Set(textItems.map((item) => item.fontName)))

  const runs = textItems.map((item) => {
    const fontInfo = fontInfoByName.get(item.fontName)
    return {
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      sizePt: fontSizeFromTransform(item.transform),
      bold: Boolean(fontInfo?.bold || fontInfo?.black),
      italic: Boolean(fontInfo?.italic),
      fontFamily: cleanFontFamily(fontInfo?.name) || cleanFontFamily(fontInfo?.fallbackName),
    }
  })

  // getTextContent() returns items in content-stream order, which for
  // multi-column layouts, tables, or interleaved graphics state is often NOT
  // top-to-bottom reading order. Cluster into column bands first (a no-op
  // for single-column pages), then within each column sort by position
  // (pdf.js y grows upward, so descending y = top to bottom) so line-
  // grouping sees visually adjacent runs consecutively instead of jumbled
  // stream order, and columns read fully before moving to the next one.
  const columns = clusterRunsIntoColumns(runs).sort((a, b) => {
    const aMinX = Math.min(...a.map((r) => r.x))
    const bMinX = Math.min(...b.map((r) => r.x))
    return aMinX - bMinX
  })

  // Tag each line with its column index so callers that also place images
  // can read column 0 fully before column 1, rather than re-flattening
  // everything back to absolute-y order and undoing the column clustering.
  return columns.flatMap((columnRuns, columnIndex) => {
    const orderedRuns = [...columnRuns].sort((a, b) => b.y - a.y || a.x - b.x)
    return groupRunsIntoLines(orderedRuns).map((line) => ({ ...line, columnIndex }))
  })
}

export function estimateBodyFontSize(lines) {
  const sizes = lines.flatMap((line) => line.runs.map((r) => r.sizePt))
  if (sizes.length === 0) return 12
  sizes.sort((a, b) => a - b)
  return sizes[Math.floor(sizes.length / 2)]
}
