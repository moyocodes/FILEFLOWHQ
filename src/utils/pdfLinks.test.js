import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { remapInternalLinks } from './pdfLinks.js'

// Source: 3 pages. Page 1 has a web link, a direct jump to page 3, and a
// GoTo-action jump to page 2.
async function makeSource() {
  const src = await PDFDocument.create()
  for (let i = 0; i < 3; i++) src.addPage([200, 200])
  const ctx = src.context
  const web = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10], A: { S: 'URI', URI: PDFString.of('https://example.com') } }))
  const toP3 = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 20, 10, 30], Dest: [src.getPage(2).ref, 'Fit'] }))
  const toP2 = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 40, 10, 50], A: { S: 'GoTo', D: [src.getPage(1).ref, 'Fit'] } }))
  src.getPage(0).node.set(PDFName.of('Annots'), ctx.obj([web, toP3, toP2]))
  return PDFDocument.load(await src.save())
}

async function copy(src, indices) {
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, indices)
  copied.forEach((p) => out.addPage(p))
  remapInternalLinks(src, indices, copied)
  return PDFDocument.load(await out.save())
}

const annots = (doc, page) => {
  const arr = doc.getPage(page).node.Annots()
  return Array.from({ length: arr.size() }, (_, i) => doc.context.lookup(arr.get(i)))
}
const destPage = (doc, annot) => {
  const d = annot.get(PDFName.of('Dest'))
  return d ? doc.getPages().findIndex((p) => p.ref === d.get(0)) : null
}

describe('remapInternalLinks', () => {
  it('keeps web links and points internal links at the copied pages (merge)', async () => {
    const out = await copy(await makeSource(), [0, 1, 2])
    const [web, toP3, toP2] = annots(out, 0)
    expect(out.context.lookup(web.get(PDFName.of('A'))).get(PDFName.of('URI')).decodeText()).toBe('https://example.com')
    expect(destPage(out, toP3)).toBe(2)
    expect(destPage(out, toP2)).toBe(1)
  })

  it('remaps by position and drops jumps to pages left out (split)', async () => {
    const out = await copy(await makeSource(), [0, 2]) // pages 1 and 3
    const [, toP3, toP2] = annots(out, 0)
    expect(destPage(out, toP3)).toBe(1)
    expect(toP2.get(PDFName.of('Dest'))).toBeUndefined()
    expect(toP2.get(PDFName.of('A'))).toBeUndefined()
  })
})
