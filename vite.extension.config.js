import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Chrome extension (Manifest V3) build: `npm run build:extension`.
// No PWA plugin (the extension has its own lifecycle) and a separate publicDir
// so the website's static files aren't copied into the extension package.
// jsPDF ships an optional 'pdfobjectnewwindow' output mode that would load a
// script from a CDN. This app only ever calls doc.output('blob'), so the path
// is dead code — but the literal URL looks like remote code to Chrome Web Store
// review (MV3 forbids remotely hosted code), so blank it out of the bundle.
const stripUnusedCdnUrls = {
  name: 'strip-unused-cdn-urls',
  renderChunk(code) {
    return code.replaceAll('https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js', '')
  },
}

export default defineConfig({
  plugins: [react(), stripUnusedCdnUrls],
  base: './',
  publicDir: 'extension/public',
  build: {
    target: 'esnext',
    outDir: 'dist-extension',
    emptyOutDir: true,
    rollupOptions: { input: 'sidepanel.html' },
  },
})
