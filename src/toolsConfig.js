import {
  Image as ImageIcon,
  Minimize2,
  FileImage,
  Images,
  Combine,
  FileText,
  Table2
} from 'lucide-react'

import useImageConverter from './tools/ImageConverter.jsx'
import useImageCompressor from './tools/ImageCompressor.jsx'
import useImagesToPdf from './tools/ImagesToPdf.jsx'
import usePdfToImages from './tools/PdfToImages.jsx'
import useMergeSplitPdf from './tools/MergeSplitPdf.jsx'
import usePdfToWord from './tools/PdfToWord.jsx'
import useCsvJson from './tools/CsvJson.jsx'

// Single source of truth: order here controls sidebar order, home page
// card order, and route registration.
export const tools = [
  {
    id: 'image-converter',
    path: '/tools/image-converter',
    name: 'Image Converter',
    tagline: 'Convert between PNG, JPG, and WebP',
    description: 'Convert images between PNG, JPG, and WebP right in your browser.',
    icon: ImageIcon,
    component: useImageConverter,
    formats: ['PNG', 'JPG', 'WEBP']
  },
  {
    id: 'image-compressor',
    path: '/tools/image-compressor',
    name: 'Image Compressor',
    tagline: 'Shrink file size or resize dimensions',
    description: 'Reduce image file size or resize dimensions before you download.',
    icon: Minimize2,
    component: useImageCompressor,
    formats: ['JPG', 'PNG', 'WEBP']
  },
  {
    id: 'images-to-pdf',
    path: '/tools/images-to-pdf',
    name: 'Images to PDF',
    tagline: 'Combine images into one PDF',
    description: 'Combine one or more images into a single downloadable PDF.',
    icon: FileImage,
    component: useImagesToPdf,
    formats: ['IMG', 'PDF']
  },
  {
    id: 'pdf-to-images',
    path: '/tools/pdf-to-images',
    name: 'PDF to Images',
    tagline: 'Split PDF pages into image files',
    description: 'Turn every page of a PDF into a downloadable PNG image.',
    icon: Images,
    component: usePdfToImages,
    formats: ['PDF', 'IMG']
  },
  {
    id: 'merge-split-pdf',
    path: '/tools/merge-split-pdf',
    name: 'Merge / Split PDF',
    tagline: 'Combine PDFs or pull out page ranges',
    description: 'Merge multiple PDFs into one, or extract a page range from a PDF.',
    icon: Combine,
    component: useMergeSplitPdf,
    formats: ['PDF', 'PDF']
  },
  {
    id: 'pdf-to-word',
    path: '/tools/pdf-to-word',
    name: 'PDF to Word',
    tagline: 'Basic text extraction to .docx',
    description: 'Pull the text out of a PDF and drop it into an editable Word file.',
    icon: FileText,
    component: usePdfToWord,
    formats: ['PDF', 'DOCX']
  },
  {
    id: 'csv-json',
    path: '/tools/csv-json',
    name: 'CSV ⇄ JSON',
    tagline: 'Convert tabular data both ways',
    description: 'Convert CSV to JSON or JSON to CSV, with instant preview.',
    icon: Table2,
    component: useCsvJson,
    formats: ['CSV', 'JSON']
  }
]

export const getToolById = (id) => tools.find((t) => t.id === id)
