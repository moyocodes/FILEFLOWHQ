// Tool data for the promo clips. Kept separate from the site's toolsConfig.js
// (which imports every tool's code) so the video bundle stays small.
// headline: [before, mint keyword, after]
export const TOOLS = [
  { id: 'image-converter', name: 'Image Converter', from: 'PNG', to: 'WEBP', kind: 'image', headline: ['Convert images in ', 'one tap', '.'] },
  { id: 'svg-to-png', name: 'SVG to PNG', from: 'SVG', to: 'PNG', kind: 'image', headline: ['Vectors to ', 'sharp', ' PNGs.'] },
  { id: 'image-compressor', name: 'Image & PDF Compressor', from: '4.2 MB', to: '480 KB', kind: 'image', headline: ['Compress to the ', 'size', ' you need.'] },
  { id: 'images-to-pdf', name: 'Images to PDF', from: 'JPG', to: 'PDF', kind: 'doc', headline: ['Photos into ', 'one PDF', '.'] },
  { id: 'pdf-to-images', name: 'PDF to Images', from: 'PDF', to: 'PNG', kind: 'doc', headline: ['Every page as an ', 'image', '.'] },
  { id: 'merge-split-pdf', name: 'Merge / Split PDF', from: 'PDF', to: 'PDF', kind: 'doc', headline: ['', 'Merge', ' and split PDFs.'] },
  { id: 'pdf-to-word', name: 'PDF to Word', from: 'PDF', to: 'DOCX', kind: 'doc', headline: ['PDFs you can ', 'edit', '.'] },
  { id: 'word-to-pdf', name: 'Word to PDF', from: 'DOCX', to: 'PDF', kind: 'doc', headline: ['Word to PDF, ', 'instantly', '.'] },
  { id: 'pdf-read-aloud', name: 'PDF Read Aloud', from: 'PDF', to: 'AUDIO', kind: 'doc', headline: ['Let your PDFs ', 'talk', '.'] },
  { id: 'csv-json', name: 'CSV ⇄ JSON', from: 'CSV', to: 'JSON', kind: 'data', headline: ['Data, ', 'both ways', '.'] },
  { id: 'document-scanner', name: 'Document Scanner', from: 'PAPER', to: 'PDF', kind: 'doc', headline: ['Scan paper straight to ', 'PDF', '.'] },
  { id: 'qr-scanner', name: 'QR & Barcode Scanner', from: 'QR', to: 'LINK', kind: 'data', headline: ['Scan any ', 'code', '.'] },
  { id: 'url-shortener', name: 'URL Shortener', from: 'LONG', to: 'SHORT', kind: 'data', headline: ['Long links, made ', 'short', '.'] }
]
