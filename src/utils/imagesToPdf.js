import { jsPDF } from 'jspdf'
import { loadImage } from './fileHelpers.js'

/**
 * Build a single PDF Blob from an ordered list of image Files/Blobs.
 *
 * Shared by the "Images to PDF" tool and the camera "Document Scanner" — both
 * turn a sequence of images into pages, so the layout logic lives here once.
 *
 * @param {Array<File|Blob>} images  images in page order
 * @param {object} [opts]
 * @param {'fit'|'a4'} [opts.pageSize='fit']  'fit' = page matches each image's
 *        pixel size; 'a4' = each image is centered on an A4 page.
 * @param {(fraction:number)=>void} [opts.onProgress]  0..1 progress callback.
 * @returns {Promise<Blob>}  the assembled PDF.
 */
export async function buildImagesPdf(images, { pageSize = 'fit', onProgress } = {}) {
  if (!images || images.length === 0) {
    throw new Error('No images to add to the PDF.')
  }

  let doc = null

  for (let i = 0; i < images.length; i++) {
    const { img, url } = await loadImage(images[i])
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight

    let pageW, pageH, drawW, drawH, x, y
    if (pageSize === 'a4') {
      pageW = 595.28
      pageH = 841.89
      const scale = Math.min(pageW / imgW, pageH / imgH)
      drawW = imgW * scale
      drawH = imgH * scale
      x = (pageW - drawW) / 2
      y = (pageH - drawH) / 2
    } else {
      pageW = imgW
      pageH = imgH
      drawW = imgW
      drawH = imgH
      x = 0
      y = 0
    }

    const orientation = pageW > pageH ? 'landscape' : 'portrait'

    if (!doc) {
      // Construct the document with the first page's exact size instead of
      // deleting jsPDF's default page (which throws if it's the only one).
      doc = new jsPDF({ unit: 'pt', orientation, format: [pageW, pageH] })
    } else {
      doc.addPage([pageW, pageH], orientation)
    }

    const type = images[i].type || ''
    const format = /png/i.test(type) ? 'PNG' : 'JPEG'
    doc.addImage(img, format, x, y, drawW, drawH)
    URL.revokeObjectURL(url)
    onProgress?.((i + 1) / images.length)
  }

  return doc.output('blob')
}
