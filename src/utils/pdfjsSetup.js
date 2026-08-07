import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a hashed worker file URL at build time and bundles
// it, so no CDN dependency or extra static-file copying is needed.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default pdfjsLib
