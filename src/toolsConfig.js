import {
  Image as ImageIcon,
  Minimize2,
  FileImage,
  Images,
  Combine,
  FileText,
  FileType,
  Table2,
  ScanLine,
  QrCode,
  FileOutput
} from 'lucide-react'

import useImageConverter from './tools/ImageConverter.jsx'
import useImageCompressor from './tools/ImageCompressor.jsx'
import useImagesToPdf from './tools/ImagesToPdf.jsx'
import usePdfToImages from './tools/PdfToImages.jsx'
import useMergeSplitPdf from './tools/MergeSplitPdf.jsx'
import usePdfToWord from './tools/PdfToWord.jsx'
import useDocxToPdf from './tools/DocxToPdf.jsx'
import usePdfToText from './tools/PdfToText.jsx'
import useCsvJson from './tools/CsvJson.jsx'
import useDocumentScanner from './tools/DocumentScanner.jsx'
import useQrScanner from './tools/QrScanner.jsx'

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
    formats: ['PNG', 'JPG', 'WEBP'],
    seoTitle: 'Image Converter — PNG to JPG, JPG to PNG & WebP, Free Online',
    seoDescription:
      'Free online image converter. Convert PNG to JPG, JPG to PNG, and to/from WebP instantly in your browser. No uploads, no watermarks, 100% private.',
    keywords: 'png to jpg, jpg to png, webp converter, image converter, convert png to jpg free',
    intro:
      'Convert images between PNG, JPG, and WebP for free, directly in your browser. Your files never leave your device — conversion runs locally, so there are no uploads, no servers, and no tracking.',
    howTo: [
      'Drag and drop your image (PNG, JPG, or WebP) into the box above, or click to browse.',
      'Choose the output format you want to convert to.',
      'Adjust quality if needed, then download your converted image instantly.',
    ],
    faq: [
      {
        q: 'How do I convert PNG to JPG for free?',
        a: 'Upload your PNG above, choose JPG as the output format, and download the result. It is completely free with no watermark, and the file is processed locally in your browser.',
      },
      {
        q: 'Are my images uploaded to a server?',
        a: 'No. FileFlowHQ converts images entirely inside your browser. Nothing is ever sent to a server, so your images stay private.',
      },
      {
        q: 'What is the difference between PNG, JPG, and WebP?',
        a: 'PNG is lossless and supports transparency, JPG is smaller and best for photos, and WebP offers modern compression that is smaller than both while keeping high quality.',
      },
    ],
  },
  {
    id: 'image-compressor',
    path: '/tools/image-compressor',
    name: 'Image Compressor',
    tagline: 'Shrink file size or resize dimensions',
    description: 'Reduce image file size or resize dimensions before you download.',
    icon: Minimize2,
    component: useImageCompressor,
    formats: ['JPG', 'PNG', 'WEBP'],
    seoTitle: 'Image Compressor — Reduce Image File Size Free & Online',
    seoDescription:
      'Compress JPG, PNG, and WebP images to reduce file size without losing quality. Resize dimensions too. Free, private, and runs entirely in your browser.',
    keywords: 'image compressor, compress jpg, reduce image size, resize image, compress png online',
    intro:
      'Shrink image file sizes or resize dimensions for free, right in your browser. Perfect for speeding up websites, meeting upload limits, or emailing photos — all without uploading your files anywhere.',
    howTo: [
      'Drop your image (JPG, PNG, or WebP) into the box above.',
      'Set your target quality or new dimensions.',
      'Download the smaller, optimized image.',
    ],
    faq: [
      {
        q: 'How can I reduce image file size without losing quality?',
        a: 'Lower the quality slider slightly or convert to WebP — both dramatically cut file size while keeping the image looking sharp. Compression happens locally in your browser.',
      },
      {
        q: 'Is this image compressor free?',
        a: 'Yes, it is completely free with no watermarks and no sign-up required.',
      },
      {
        q: 'Can I resize the dimensions as well as compress?',
        a: 'Yes. You can set new width and height values to resize the image in addition to compressing it.',
      },
    ],
  },
  {
    id: 'images-to-pdf',
    path: '/tools/images-to-pdf',
    name: 'Images to PDF',
    tagline: 'Combine images into one PDF',
    description: 'Combine one or more images into a single downloadable PDF.',
    icon: FileImage,
    component: useImagesToPdf,
    formats: ['IMG', 'PDF'],
    seoTitle: 'Images to PDF — Convert JPG & PNG to PDF Free Online',
    seoDescription:
      'Combine JPG and PNG images into a single PDF for free. Reorder pages, choose page size, and download instantly. No uploads — runs in your browser.',
    keywords: 'images to pdf, jpg to pdf, png to pdf, convert images to pdf, combine images into pdf',
    intro:
      'Turn one or more images into a single PDF for free. Drag to reorder pages, pick a page size, and download — all locally in your browser with no uploads.',
    howTo: [
      'Add your images (JPG, PNG, or WebP) using the box above.',
      'Drag the rows to arrange the page order.',
      'Choose a page size and click Create PDF to download.',
    ],
    faq: [
      {
        q: 'How do I convert JPG images to a PDF?',
        a: 'Add your JPG files above, arrange them in the order you want, and click Create PDF. The combined PDF downloads instantly.',
      },
      {
        q: 'Can I combine multiple images into one PDF?',
        a: 'Yes. Add as many images as you like — each becomes a page in a single PDF, and you can drag to reorder them.',
      },
      {
        q: 'Does this upload my images anywhere?',
        a: 'No. The PDF is built entirely in your browser, so your images never leave your device.',
      },
    ],
  },
  {
    id: 'pdf-to-images',
    path: '/tools/pdf-to-images',
    name: 'PDF to Images',
    tagline: 'Split PDF pages into image files',
    description: 'Turn every page of a PDF into a downloadable PNG image.',
    icon: Images,
    component: usePdfToImages,
    formats: ['PDF', 'IMG'],
    seoTitle: 'PDF to Images — Convert PDF to JPG & PNG Free Online',
    seoDescription:
      'Convert PDF pages to PNG or JPG images for free. Extract every page as a high-quality image, right in your browser. No uploads, completely private.',
    keywords: 'pdf to images, pdf to jpg, pdf to png, convert pdf to image, extract images from pdf',
    intro:
      'Convert each page of a PDF into a downloadable image for free. Great for grabbing a page as a picture or extracting content — processed entirely in your browser with no uploads.',
    howTo: [
      'Drop your PDF into the box above.',
      'Each page is rendered as an image automatically.',
      'Download the images individually or as a zip.',
    ],
    faq: [
      {
        q: 'How do I convert a PDF to JPG or PNG?',
        a: 'Upload your PDF above and each page is turned into an image you can download. Everything happens locally in your browser.',
      },
      {
        q: 'Is there a page limit?',
        a: 'No hard limit — large PDFs simply take a little longer to render since all processing is done on your own device.',
      },
      {
        q: 'Will the image quality be good?',
        a: 'Yes. Pages are rendered at high resolution so text and graphics stay crisp.',
      },
    ],
  },
  {
    id: 'merge-split-pdf',
    path: '/tools/merge-split-pdf',
    name: 'Merge / Split PDF',
    tagline: 'Combine PDFs or pull out page ranges',
    description: 'Merge multiple PDFs into one, or extract a page range from a PDF.',
    icon: Combine,
    component: useMergeSplitPdf,
    formats: ['PDF', 'PDF'],
    seoTitle: 'Merge & Split PDF — Combine or Extract PDF Pages Free Online',
    seoDescription:
      'Merge multiple PDFs into one or split out a page range for free. Fast, private, and entirely browser-based — your files are never uploaded.',
    keywords: 'merge pdf, split pdf, combine pdf, pdf merger, extract pdf pages',
    intro:
      'Merge several PDFs into a single document, or split out a specific page range — for free and fully in your browser. No uploads, no watermarks, no limits.',
    howTo: [
      'Add the PDF files you want to merge, or a single PDF to split.',
      'Arrange the order to merge, or enter a page range to split.',
      'Download your new PDF instantly.',
    ],
    faq: [
      {
        q: 'How do I merge two or more PDFs into one?',
        a: 'Add all your PDF files above, arrange them in order, and download the combined file. It is free and processed locally.',
      },
      {
        q: 'Can I extract just a few pages from a PDF?',
        a: 'Yes. Use the split option and enter a page range (for example 3-7) to pull out just those pages.',
      },
      {
        q: 'Are my PDFs kept private?',
        a: 'Completely. Merging and splitting happen in your browser, so nothing is uploaded to any server.',
      },
    ],
  },
  {
    id: 'pdf-to-word',
    path: '/tools/pdf-to-word',
    name: 'PDF to Word',
    tagline: 'Editable .docx with tables, lists & links',
    description: 'Convert a PDF into an editable Word document — text styling, tables, lists, links, and images.',
    icon: FileText,
    component: usePdfToWord,
    comingSoon: true,
    formats: ['PDF', 'DOCX'],
    seoTitle: 'PDF to Word — Convert PDF to Editable DOCX Free Online',
    seoDescription:
      'Convert PDF text into an editable Word (.docx) document for free, right in your browser. No uploads, no sign-up. Coming soon to FileFlowHQ.',
    keywords: 'pdf to word, pdf to docx, convert pdf to word, pdf to editable document',
    intro:
      'Extract the text from a PDF into an editable Word document for free. This tool runs locally in your browser so your documents stay private.',
    howTo: [
      'Drop your PDF into the box above.',
      'The text is extracted from every page.',
      'Download an editable .docx Word file.',
    ],
    faq: [
      {
        q: 'How do I convert a PDF to an editable Word document?',
        a: 'Upload your PDF and download a .docx file containing the extracted text, ready to edit in Word or Google Docs.',
      },
      {
        q: 'Is the formatting preserved?',
        a: 'This tool focuses on extracting the text content. Complex layouts may be simplified, but the words come through cleanly.',
      },
    ],
  },
  {
    id: 'word-to-pdf',
    path: '/tools/word-to-pdf',
    name: 'Word to PDF',
    tagline: 'Convert .docx to PDF',
    description: 'Convert a Word (.docx) document into a PDF, preserving text, lists, tables, and images.',
    icon: FileOutput,
    component: useDocxToPdf,
    formats: ['DOCX', 'PDF'],
    seoTitle: 'Word to PDF — Convert DOCX to PDF Free Online',
    seoDescription:
      'Convert Word documents to PDF for free, right in your browser. Preserve text, lists, tables, and images. No uploads, no sign-up, 100% private.',
    keywords: 'word to pdf, docx to pdf, convert word to pdf, convert docx to pdf online',
    intro:
      'Convert a Word (.docx) document into a PDF for free, directly in your browser. Your file never leaves your device — conversion runs locally, so there are no uploads, no servers, and no tracking.',
    howTo: [
      'Drop your .docx file into the box above.',
      'The document is parsed and laid out on PDF pages automatically.',
      'Download your converted PDF instantly.',
    ],
    faq: [
      {
        q: 'How do I convert a Word document to PDF for free?',
        a: 'Upload your .docx file above and download the generated PDF. It is free, with no watermark, and the file is processed locally in your browser.',
      },
      {
        q: 'Is the formatting preserved?',
        a: 'Text, headings, lists, tables, and images are reconstructed and laid out on standard A4 pages. Complex layouts like columns or precise positioning are approximated.',
      },
      {
        q: 'Is my document uploaded to a server?',
        a: 'No. FileFlowHQ converts the document entirely inside your browser. Nothing is ever sent to a server, so your file stays private.',
      },
    ],
  },
  {
    id: 'pdf-to-text',
    path: '/tools/pdf-to-text',
    name: 'PDF to Text',
    tagline: 'Plain text extraction, reading order preserved',
    description: 'Pull the plain text out of a PDF, in reading order, as a .txt file — no formatting, no surprises.',
    icon: FileType,
    component: usePdfToText,
    formats: ['PDF', 'TXT'],
    seoTitle: 'PDF to Text — Extract Text from PDF Free Online',
    seoDescription:
      'Extract plain text from any PDF for free, in the correct reading order, as a .txt file. Private and browser-based — no uploads or sign-up.',
    keywords: 'pdf to text, extract text from pdf, pdf to txt, copy text from pdf',
    intro:
      'Pull the plain text out of a PDF in reading order and download it as a .txt file — for free and entirely in your browser. Ideal for copying content or feeding text into other tools.',
    howTo: [
      'Drop your PDF into the box above.',
      'The text is extracted in natural reading order.',
      'Download it as a clean .txt file.',
    ],
    faq: [
      {
        q: 'How do I extract text from a PDF for free?',
        a: 'Upload your PDF above and download a .txt file with all the text in reading order. It is free and processed locally in your browser.',
      },
      {
        q: 'Does it work on scanned PDFs?',
        a: 'This tool extracts existing text layers. Scanned image-only PDFs without a text layer would need OCR, which is not yet supported.',
      },
    ],
  },
  {
    id: 'csv-json',
    path: '/tools/csv-json',
    name: 'CSV ⇄ JSON',
    tagline: 'Convert tabular data both ways',
    description: 'Convert CSV to JSON or JSON to CSV, with instant preview.',
    icon: Table2,
    component: useCsvJson,
    formats: ['CSV', 'JSON'],
    seoTitle: 'CSV to JSON Converter — Convert JSON to CSV Free Online',
    seoDescription:
      'Convert CSV to JSON or JSON to CSV instantly, for free, with a live preview. Runs entirely in your browser — your data is never uploaded.',
    keywords: 'csv to json, json to csv, convert csv to json, csv json converter',
    intro:
      'Convert CSV to JSON or JSON to CSV both ways, for free, with an instant preview. All parsing happens in your browser, so your data stays completely private.',
    howTo: [
      'Paste or drop your CSV or JSON data above.',
      'Pick the conversion direction (CSV to JSON or JSON to CSV).',
      'Preview the result and download the converted file.',
    ],
    faq: [
      {
        q: 'How do I convert CSV to JSON online?',
        a: 'Paste or upload your CSV above, choose CSV to JSON, and download or copy the JSON output. It is free and runs locally.',
      },
      {
        q: 'Can I convert JSON back to CSV?',
        a: 'Yes, the converter works both directions — switch the mode to turn a JSON array into a CSV file.',
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. Conversion happens entirely in your browser, so your data is never sent to a server.',
      },
    ],
  },
  {
    id: 'document-scanner',
    path: '/tools/document-scanner',
    name: 'Document Scanner',
    tagline: 'Scan pages with your camera to PDF',
    description: 'Use your camera to scan documents and save them as a multi-page PDF.',
    icon: ScanLine,
    component: useDocumentScanner,
    formats: ['CAM', 'PDF'],
    seoTitle: 'Document Scanner — Scan Documents to PDF Free Online',
    seoDescription:
      'Scan documents with your phone or webcam and save them as a PDF for free. Capture multiple pages, reorder them, and download — all private, in your browser.',
    keywords:
      'document scanner, scan to pdf, scan documents, camera to pdf, scan document to pdf, free document scanner',
    intro:
      'Turn your camera into a document scanner. Capture one or more pages, arrange them in order, and save the whole thing as a single PDF — for free, with no uploads. On a phone it uses the camera directly; on a laptop you can snap a photo or pick an image.',
    howTo: [
      'Tap Scan a page to capture the first page with your camera (or choose an image on desktop).',
      'Add as many pages as you need — each one becomes a page in the PDF.',
      'Drag to reorder the pages, then tap Save as PDF to download or share.',
    ],
    faq: [
      {
        q: 'How do I scan a document to PDF for free?',
        a: 'Open the Document Scanner, capture each page with your camera, and tap Save as PDF. The multi-page PDF is built on your device — nothing is uploaded.',
      },
      {
        q: 'Can I scan more than one page into a single PDF?',
        a: 'Yes. Add each page one at a time and they are combined into one PDF, in the order you arrange them.',
      },
      {
        q: 'Does scanning upload my documents anywhere?',
        a: 'No. The scan is captured and turned into a PDF entirely on your device, so your documents stay completely private.',
      },
    ],
  },
  {
    id: 'qr-scanner',
    path: '/tools/qr-scanner',
    name: 'QR & Barcode Scanner',
    tagline: 'Read QR codes and barcodes with your camera',
    description: 'Scan a QR code or barcode with your camera and copy or open the result.',
    icon: QrCode,
    component: useQrScanner,
    formats: ['QR', 'TEXT'],
    seoTitle: 'QR Code & Barcode Scanner — Scan Online Free',
    seoDescription:
      'Scan QR codes and barcodes with your camera for free, right in your browser. Instantly read the result and copy it or open the link. Private — nothing is uploaded.',
    keywords:
      'qr code scanner, barcode scanner, scan qr code, read qr code, online qr scanner, scan barcode',
    intro:
      'Scan any QR code or barcode with your camera and instantly see what it contains. Copy the text or open the link with one tap. Everything is decoded on your device — no app to install and nothing is uploaded.',
    howTo: [
      'Tap Start scanning and allow camera access when prompted.',
      'Point your camera at the QR code or barcode.',
      'Read the decoded result, then copy it or open the link.',
    ],
    faq: [
      {
        q: 'How do I scan a QR code online?',
        a: 'Tap Start scanning, allow camera access, and point your camera at the QR code. The decoded value appears instantly with buttons to copy it or open the link.',
      },
      {
        q: 'What kinds of codes can it read?',
        a: 'It reads QR codes as well as common barcodes such as EAN, UPC, and Code 128, among others.',
      },
      {
        q: 'Is the QR scanner safe and private?',
        a: 'Yes. Codes are decoded directly in your browser using your camera, so no images or results are ever sent to a server.',
      },
    ],
  },
]

export const getToolById = (id) => tools.find((t) => t.id === id)
