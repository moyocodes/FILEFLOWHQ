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

// Full text of a line (its runs concatenated).
function lineText(line) {
  return line.runs.map((r) => r.text).join('')
}

// Rightmost x reached by a line's text, using each run's advance width.
function lineRightEdge(line) {
  return line.runs.reduce((max, r) => Math.max(max, r.x + (r.widthPt || 0)), 0)
}

// Bullet glyphs that start an unordered list item.
const BULLET_RE = /^\s*[•◦▪‣·–—*-]\s+/
// Ordered markers like "1.", "1)", "(1)", "a.", "iv)" — captured loosely, then
// validated structurally so prose like "1990." or "-emphasis" isn't caught.
const ORDERED_RE = /^\s*\(?([0-9]{1,3}|[ivxlcdm]{1,6}|[A-Za-z])([.)])\s+/i

// Classify a line's leading marker as a list item, or return null.
// Conservative on purpose: a false positive turns prose into a list, which is
// worse than missing a list, so we require a real marker + trailing space.
function classifyListMarker(line) {
  const text = lineText(line)
  if (BULLET_RE.test(text)) {
    return { kind: 'bullet', textAfterMarker: text.replace(BULLET_RE, '') }
  }
  const m = ORDERED_RE.exec(text)
  if (m) {
    const token = m[1]
    let format = 'decimal'
    if (/^[0-9]+$/.test(token)) format = 'decimal'
    else if (/^[ivxlcdm]+$/i.test(token)) format = token === token.toLowerCase() ? 'lowerRoman' : 'upperRoman'
    else format = token === token.toLowerCase() ? 'lowerLetter' : 'upperLetter'
    return { kind: 'ordered', format, delimiter: m[2], textAfterMarker: text.replace(ORDERED_RE, '') }
  }
  return null
}

// Tag lines that are list items and group contiguous items into list instances
// so each gets its own numbering sequence. Mutates lines with `.list`.
function annotateLists(lines) {
  let listId = 0
  let inList = false
  let currentKind = null
  for (let i = 0; i < lines.length; i++) {
    const marker = classifyListMarker(lines[i])
    if (marker) {
      // A new list starts on the first item, on a kind change, or after a break.
      if (!inList || marker.kind !== currentKind || lines[i].isParagraphStart) {
        // Only bump into a fresh instance when the previous line wasn't a list.
        if (!inList) listId += 1
      }
      inList = true
      currentKind = marker.kind
      const level = Math.max(0, Math.round((lines[i].minX - lines[0].minX) / 18))
      lines[i].list = { ...marker, listId, level: Math.min(level, 4) }
    } else {
      inList = false
      currentKind = null
    }
  }
  return lines
}

// Second pass over grouped lines to fix over-eager paragraph breaks: join
// soft-wrapped lines (line ends mid-sentence / next starts lowercase) and
// hyphenated word splits, so body text reads as real paragraphs in Word.
// Sets `joinPrev` = 'soft' | 'hyphen' on lines that continue the previous one.
function refineParagraphBreaks(lines) {
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]
    const cur = lines[i]
    if (cur.isParagraphStart) continue // an explicit large gap: respect it
    if (cur.columnIndex !== prev.columnIndex) continue // never merge across columns
    // Never merge a heading into body text (size jump).
    if (Math.abs(cur.maxSize - prev.maxSize) > prev.maxSize * 0.2) continue

    const prevText = lineText(prev).trimEnd()
    const curText = lineText(cur).trimStart()
    if (!prevText || !curText) continue

    const endsHyphen = /[A-Za-z]-$/.test(prevText)
    const endsSentence = /[.?!:;]["')\]]?$/.test(prevText)
    const nextLower = /^[a-z]/.test(curText)
    // Right edge near the column's filled width also signals a wrapped line.
    const wrapped = !endsSentence && (nextLower || endsHyphen)

    if (endsHyphen) cur.joinPrev = 'hyphen'
    else if (wrapped) cur.joinPrev = 'soft'
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
      widthPt: item.width || 0, // advance width in points; used for link hit-testing
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
  const lines = columns.flatMap((columnRuns, columnIndex) => {
    const orderedRuns = [...columnRuns].sort((a, b) => b.y - a.y || a.x - b.x)
    return groupRunsIntoLines(orderedRuns).map((line) => ({ ...line, columnIndex }))
  })

  // Refine loose paragraph breaks into soft-wrap continuations, then tag list
  // items. Both are additive: callers that ignore `joinPrev`/`list` still get
  // the same line stream as before.
  refineParagraphBreaks(lines)
  annotateLists(lines)
  return lines
}

// Extract hyperlink annotations as rectangles in PDF user space (y-up,
// bottom-left origin) — the same space as run.x/run.y — so link hit-testing
// needs no coordinate conversion. Returns [{ url, x0, y0, x1, y1 }].
export async function extractPageLinks(page) {
  const annotations = await page.getAnnotations()
  const links = []
  for (const a of annotations) {
    if (a.subtype !== 'Link') continue
    const url = a.url || a.unsafeUrl
    if (!url || !a.rect) continue
    const [ax, ay, bx, by] = a.rect
    links.push({
      url,
      x0: Math.min(ax, bx),
      y0: Math.min(ay, by),
      x1: Math.max(ax, bx),
      y1: Math.max(ay, by),
    })
  }
  return links
}

// Attach `href` to any run whose box overlaps a link rectangle. Whole-run
// granularity (no character splitting): a run is linked when its vertical
// midpoint falls in the rect and its x-span overlaps the rect by ≥40%.
export function applyLinksToRuns(lines, links) {
  if (!links || links.length === 0) return lines
  for (const line of lines) {
    for (const run of line.runs) {
      const runX0 = run.x
      const runX1 = run.x + (run.widthPt || run.text.length * run.sizePt * 0.5)
      const midY = run.y + run.sizePt * 0.35
      for (const link of links) {
        if (midY < link.y0 || midY > link.y1) continue
        const overlap = Math.min(runX1, link.x1) - Math.max(runX0, link.x0)
        const runWidth = Math.max(1, runX1 - runX0)
        if (overlap >= runWidth * 0.4) {
          run.href = link.url
          break
        }
      }
    }
  }
  return lines
}

export function estimateBodyFontSize(lines) {
  const sizes = lines.flatMap((line) => line.runs.map((r) => r.sizePt))
  if (sizes.length === 0) return 12
  sizes.sort((a, b) => a - b)
  return sizes[Math.floor(sizes.length / 2)]
}

// ---------------------------------------------------------------------------
// Table detection
//
// PDFs have no "table" concept — a table is just text at positions plus, for
// bordered tables, drawn line/rectangle strokes. We detect two kinds:
//   1. Ruled  — reconstruct the grid from drawn horizontal/vertical rulings.
//   2. Borderless — infer columns from consistent multi-row text alignment.
// Both produce { bbox, rows: [[cellLines,...],...], ruled } and their runs are
// removed from the loose-paragraph stream so text isn't emitted twice.
// All geometry is in PDF user-space points (y-up), matching run.x/run.y.
// ---------------------------------------------------------------------------

const AXIS_TOL = 1.6 // pt; how flat/plumb a segment must be to count as H/V
const MIN_LINE_LEN = 8 // pt; ignore rule fragments shorter than this
const COORD_MERGE_TOL = 3 // pt; snap near-duplicate ruling coordinates together

// Cluster a sorted list of coordinates, averaging values within tol into one.
function clusterCoords(values, tol) {
  if (values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const clusters = []
  let group = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - group[group.length - 1] <= tol) group.push(sorted[i])
    else {
      clusters.push(group.reduce((s, v) => s + v, 0) / group.length)
      group = [sorted[i]]
    }
  }
  clusters.push(group.reduce((s, v) => s + v, 0) / group.length)
  return clusters
}

// Walk the operator list and return axis-aligned rulings in page space.
// Reuses the same CTM matrix-stack approach as extractPageImages. In pdf.js v4
// every path is batched into one OPS.constructPath whose args are
// [subOps, coords, minMax]: subOps are per-segment codes and coords is a flat
// operand array consumed in order (moveTo/lineTo=2, rectangle=4, curves=6/4/4).
async function extractPagePaths(page) {
  const opList = await page.getOperatorList()
  const OPS = pdfjsLib.OPS
  const multiply = (m1, m2) => [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ]
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

  let stack = []
  let ctm = [1, 0, 0, 1, 0, 0]
  const hSegs = [] // { x0, x1, y }
  const vSegs = [] // { y0, y1, x }

  const addSegment = (x0, y0, x1, y1) => {
    const [px0, py0] = apply(ctm, x0, y0)
    const [px1, py1] = apply(ctm, x1, y1)
    const dx = px1 - px0
    const dy = py1 - py0
    if (Math.abs(dy) <= AXIS_TOL && Math.abs(dx) >= MIN_LINE_LEN) {
      hSegs.push({ x0: Math.min(px0, px1), x1: Math.max(px0, px1), y: (py0 + py1) / 2 })
    } else if (Math.abs(dx) <= AXIS_TOL && Math.abs(dy) >= MIN_LINE_LEN) {
      vSegs.push({ y0: Math.min(py0, py1), y1: Math.max(py0, py1), x: (px0 + px1) / 2 })
    }
  }

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.save) stack.push(ctm)
    else if (fn === OPS.restore) ctm = stack.pop() || ctm
    else if (fn === OPS.transform) ctm = multiply(args, ctm)
    else if (fn === OPS.constructPath) {
      const subOps = args[0]
      const coords = args[1]
      let j = 0
      let cx = 0
      let cy = 0
      let sx = 0
      let sy = 0
      for (const op of subOps) {
        if (op === OPS.moveTo) {
          cx = coords[j++]
          cy = coords[j++]
          sx = cx
          sy = cy
        } else if (op === OPS.lineTo) {
          const nx = coords[j++]
          const ny = coords[j++]
          addSegment(cx, cy, nx, ny)
          cx = nx
          cy = ny
        } else if (op === OPS.rectangle) {
          const rx = coords[j++]
          const ry = coords[j++]
          const rw = coords[j++]
          const rh = coords[j++]
          // Four edges of the rectangle become candidate rulings.
          addSegment(rx, ry, rx + rw, ry)
          addSegment(rx + rw, ry, rx + rw, ry + rh)
          addSegment(rx + rw, ry + rh, rx, ry + rh)
          addSegment(rx, ry + rh, rx, ry)
          cx = rx
          cy = ry
          sx = rx
          sy = ry
        } else if (op === OPS.curveTo) {
          j += 6
          cx = coords[j - 2]
          cy = coords[j - 1]
        } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
          j += 4
          cx = coords[j - 2]
          cy = coords[j - 1]
        } else if (op === OPS.closePath) {
          addSegment(cx, cy, sx, sy)
          cx = sx
          cy = sy
        }
      }
    }
  }
  return { hSegs, vSegs }
}

// True if rulings cover at least `frac` of the span [a,b] at the given fixed
// coordinate (used to check a candidate cell edge is actually drawn).
function edgeCovered(segs, isH, fixed, a, b, frac) {
  const span = b - a
  if (span <= 0) return false
  let covered = 0
  for (const s of segs) {
    if (Math.abs((isH ? s.y : s.x) - fixed) > COORD_MERGE_TOL) continue
    const s0 = isH ? s.x0 : s.y0
    const s1 = isH ? s.x1 : s.y1
    covered += Math.max(0, Math.min(b, s1) - Math.max(a, s0))
  }
  return covered >= span * frac
}

// Build ruled tables from horizontal/vertical rulings. A table is a block of
// ≥2×≥2 cells whose separators are backed by real rulings.
function detectRuledTables(hSegs, vSegs) {
  const xs = clusterCoords(vSegs.map((s) => s.x), COORD_MERGE_TOL)
  const ys = clusterCoords(hSegs.map((s) => s.y), COORD_MERGE_TOL).sort((a, b) => b - a) // top→bottom
  if (xs.length < 2 || ys.length < 2) return []

  // Mark which candidate cells have enough drawn borders to be real.
  const rows = ys.length - 1
  const cols = xs.length - 1
  const present = Array.from({ length: rows }, () => Array(cols).fill(false))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const top = ys[r]
      const bottom = ys[r + 1]
      const left = xs[c]
      const right = xs[c + 1]
      let borders = 0
      if (edgeCovered(hSegs, true, top, left, right, 0.6)) borders++
      if (edgeCovered(hSegs, true, bottom, left, right, 0.6)) borders++
      if (edgeCovered(vSegs, false, left, bottom, top, 0.6)) borders++
      if (edgeCovered(vSegs, false, right, bottom, top, 0.6)) borders++
      present[r][c] = borders >= 3
    }
  }

  // If a large fraction of candidate cells are bordered, treat the whole
  // xs×ys grid as one table (typical for a fully-ruled table). This keeps the
  // implementation simple and robust for the common case; sparse/partial grids
  // that don't clear the threshold are left as normal text.
  let bordered = 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (present[r][c]) bordered++
  if (bordered < rows * cols * 0.5 || rows * cols < 2) return []

  const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  return [{ bbox, xs, ys: [...ys], ruled: true }]
}

// Assign runs to a table's cells by x/y containment, then group each cell's
// runs into lines. Returns rows[r][c] = { lines }.
function fillTableCells(table, runs) {
  const { xs, ys } = table
  const rows = ys.length - 1
  const cols = xs.length - 1
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ runs: [] }))
  )
  for (const run of runs) {
    const rx = run.x
    const ry = run.y
    if (rx < table.bbox.x0 - 1 || rx > table.bbox.x1 + 1) continue
    if (ry < table.bbox.y0 - 1 || ry > table.bbox.y1 + 1) continue
    let c = 0
    while (c < cols - 1 && rx >= xs[c + 1]) c++
    let r = 0
    while (r < rows - 1 && ry <= ys[r + 1]) r++ // ys descending
    cells[r][c].runs.push(run)
  }
  const rowLines = cells.map((row) =>
    row.map((cell) => ({ lines: groupRunsIntoLines([...cell.runs].sort((a, b) => b.y - a.y || a.x - b.x)) }))
  )
  return rowLines
}

// A line is inside a table if its baseline y and median run x fall in the bbox.
function lineInBBox(line, bbox) {
  const midX = line.runs.length ? line.runs[Math.floor(line.runs.length / 2)].x : line.minX
  return line.y <= bbox.y1 + 1 && line.y >= bbox.y0 - 1 && midX >= bbox.x0 - 1 && midX <= bbox.x1 + 1
}

// Detect borderless tables from consistent column alignment across ≥3 adjacent
// rows. Conservative: only fires when multiple rows share ≥2 aligned column
// starts separated by a real gap, so ordinary prose isn't turned into a grid.
function detectAlignmentTables(lines) {
  const tables = []
  const MIN_ROWS = 3
  const GAP = 18 // pt; minimum inter-column whitespace to call it columnar

  // Consider contiguous runs of body lines within a single column band.
  let block = []
  const flush = () => {
    if (block.length >= MIN_ROWS) tryBlock(block)
    block = []
  }
  const tryBlock = (blk) => {
    // A row qualifies only if it has ≥2 runs separated by a wide gap.
    const rowCols = blk.map((line) => {
      const starts = []
      let prevEnd = -Infinity
      for (const run of [...line.runs].sort((a, b) => a.x - b.x)) {
        if (run.x - prevEnd >= GAP) starts.push(run.x)
        prevEnd = run.x + (run.widthPt || run.text.length * run.sizePt * 0.5)
      }
      return starts
    })
    const multiColRows = rowCols.filter((s) => s.length >= 2).length
    if (multiColRows < MIN_ROWS || multiColRows < blk.length * 0.7) return

    // Derive shared column x-positions from all detected starts.
    const xs = clusterCoords(rowCols.flat(), COORD_MERGE_TOL * 2).sort((a, b) => a - b)
    if (xs.length < 2) return
    const ysTop = Math.max(...blk.map((l) => l.y)) + (blk[0].maxSize || 10)
    const ysBottom = Math.min(...blk.map((l) => l.y))
    const bbox = {
      x0: Math.min(...blk.map((l) => l.minX)),
      x1: Math.max(...blk.map((l) => lineRightEdge(l))),
      y0: ysBottom - 2,
      y1: ysTop,
    }
    // Row separators midway between consecutive line baselines.
    const sortedLines = [...blk].sort((a, b) => b.y - a.y)
    const ys = [bbox.y1]
    for (let i = 0; i < sortedLines.length - 1; i++) {
      ys.push((sortedLines[i].y + sortedLines[i + 1].y) / 2)
    }
    ys.push(bbox.y0)
    tables.push({ bbox, xs: [...xs, bbox.x1 + 1], ys, ruled: false })
  }

  const sorted = [...lines].sort((a, b) => a.columnIndex - b.columnIndex || b.y - a.y)
  let curCol = sorted.length ? sorted[0].columnIndex : 0
  for (const line of sorted) {
    if (line.columnIndex !== curCol || line.isParagraphStart) {
      flush()
      curCol = line.columnIndex
    }
    block.push(line)
  }
  flush()
  return tables
}

// Top-level page content: loose lines (outside any table), images, and tables
// with their cell lines. Link hrefs are applied before partitioning so linked
// runs inside cells keep their href. This is the single entry point PdfToWord
// consumes; extractPageLines/extractPageImages remain available and unchanged.
export async function extractPageContent(page, viewport) {
  const [lines, images, links, paths] = await Promise.all([
    extractPageLines(page),
    extractPageImages(page, viewport),
    extractPageLinks(page),
    extractPagePaths(page),
  ])
  applyLinksToRuns(lines, links)

  const allRuns = lines.flatMap((l) => l.runs)
  const ruled = detectRuledTables(paths.hSegs, paths.vSegs)

  // Remove lines consumed by ruled tables before looking for borderless ones.
  let remaining = lines.filter((line) => !ruled.some((t) => lineInBBox(line, t.bbox)))
  const aligned = detectAlignmentTables(remaining)
  remaining = remaining.filter((line) => !aligned.some((t) => lineInBBox(line, t.bbox)))

  const tables = [...ruled, ...aligned].map((t) => ({
    bbox: t.bbox,
    ruled: t.ruled,
    y: t.bbox.y1, // top edge, for reading-order interleave
    rows: fillTableCells(t, allRuns),
  }))

  return { lines: remaining, images, tables }
}
