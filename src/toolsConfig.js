import {
  Image as ImageIcon,
  Minimize2,
  FileImage,
  Images,
  Combine,
  FileText,
  Table2,
  ScanLine,
  QrCode,
  FileOutput,
  Volume2,
  Link2,
  PenTool
} from 'lucide-react'

import useImageConverter from './tools/ImageConverter.jsx'
import useImageCompressor from './tools/ImageCompressor.jsx'
import useSvgToPng from './tools/SvgToPng.jsx'
import useImagesToPdf from './tools/ImagesToPdf.jsx'
import usePdfToImages from './tools/PdfToImages.jsx'
import useMergeSplitPdf from './tools/MergeSplitPdf.jsx'
import usePdfToWord from './tools/PdfToWord.jsx'
import useDocxToPdf from './tools/DocxToPdf.jsx'
import usePdfReadAloud from './tools/PdfReadAloud.jsx'
import useCsvJson from './tools/CsvJson.jsx'
import useDocumentScanner from './tools/DocumentScanner.jsx'
import useQrScanner from './tools/QrScanner.jsx'
import useUrlShortener from './tools/UrlShortener.jsx'

// Home page / nav grouping, in display order.
export const categories = [
  { id: 'images', label: 'Images' },
  { id: 'pdf', label: 'PDF & documents' },
  { id: 'utilities', label: 'Scan & utilities' }
]

// Single source of truth: order here controls sidebar order, home page
// card order, and route registration.
export const tools = [
  {
    id: 'image-converter',
    category: 'images',
    path: '/tools/image-converter',
    name: 'Image Converter',
    tagline: 'HEIC, RAW, PSD, TIFF, PNG, JPG, WebP',
    description: 'Convert any image, including iPhone HEIC, camera RAW and Photoshop PSD, with the Studio image engine.',
    icon: ImageIcon,
    component: useImageConverter,
    formats: ['HEIC', 'RAW', 'PSD', 'TIFF', 'PNG', 'JPG', 'WEBP', 'AVIF'],
    seoTitle: 'Image Converter — HEIC to JPG, RAW, PSD, PNG, WebP Free Online',
    seoDescription:
      'Convert HEIC to JPG, camera RAW (DNG, CR2, NEF, ARW) to JPG, PSD to PNG, TIFF, WebP and AVIF for free, right in your browser. No uploads, no sign-up.',
    keywords: 'heic to jpg, raw to jpg, psd to png, png to jpg, jpg to png, webp converter, tiff converter, image converter free',
    intro:
      'Convert any image for free: iPhone HEIC photos, camera RAW files, Photoshop PSDs, TIFF, HDR and everyday PNG, JPG and WebP, to PNG, JPEG, WebP, AVIF, TIFF, PSD, GIF or BMP. The Studio image engine, the same as our Photo Editor, runs on your device, so nothing is uploaded.',
    howTo: [
      'Drop one or more images into the box above.',
      'Pick the output format, and the quality for JPEG, WebP or AVIF.',
      'Download each image, or all of them at once.',
    ],
    faq: [
      {
        q: 'How do I convert HEIC to JPG?',
        a: 'Drop your iPhone HEIC photos above, choose JPEG, and download. It works in any browser, not just Safari.',
      },
      {
        q: 'Can I convert camera RAW files?',
        a: 'Yes: DNG, Canon CR2/CR3, Nikon NEF, Sony ARW, Fujifilm RAF, Olympus ORF, Panasonic RW2 and Pentax PEF are developed and saved as JPEG, PNG, TIFF and more.',
      },
      {
        q: 'Are my images uploaded to a server?',
        a: 'No. The Studio image engine runs inside your browser (it downloads once, about 3.8 MB), so your images never leave your device. You can also strip camera and location data from the output.',
      },
      {
        q: 'What is the difference between PNG, JPG, and WebP?',
        a: 'PNG is lossless and supports transparency, JPG is smaller and best for photos, and WebP offers modern compression that is smaller than both while keeping high quality.',
      },
    ],
  },
  {
    id: 'svg-to-png',
    category: 'images',
    path: '/tools/svg-to-png',
    name: 'SVG to PNG',
    tagline: 'Render SVG vectors as sharp PNG images',
    description: 'Convert SVG files to high-resolution PNG, WebP, or AVIF at any size.',
    icon: PenTool,
    component: useSvgToPng,
    formats: ['SVG', 'PNG'],
    seoTitle: 'SVG to PNG Converter — High Resolution, Free Online',
    seoDescription:
      'Free online SVG to PNG converter. Export SVG files as crisp PNG images at 1×–4× or any custom width, with a transparent or solid background. Runs in your browser, no uploads.',
    keywords: 'svg to png, convert svg to png, svg to png high resolution, svg to png transparent, svg converter',
    intro:
      'Convert SVG vector graphics into PNG images at exactly the size you need. FileFlowHQ renders the vectors at full output resolution, so logos and icons stay sharp at 4× or 4000px wide. Everything runs in your browser — your files are never uploaded.',
    howTo: [
      'Drop one or more SVG files into the box above, or click to browse.',
      'Pick a scale (1×–4×) or type an exact width in pixels, and choose a transparent or solid background.',
      'Click Convert, then download your PNGs.',
    ],
    faq: [
      {
        q: 'Will the PNG be blurry?',
        a: 'No. The SVG is rendered directly at the output size you choose rather than being upscaled, so edges stay crisp at any resolution.',
      },
      {
        q: 'Can I keep a transparent background?',
        a: 'Yes. Transparent is the default. You can also pick white or any custom color if you need a solid background.',
      },
      {
        q: 'Why does some text or an embedded image look different?',
        a: 'Browsers render SVGs as standalone images without loading external fonts or linked files. Convert text to outlines and embed images in the SVG for an exact match.',
      },
    ],
  },
  {
    id: 'image-compressor',
    category: 'images',
    path: '/tools/image-compressor',
    name: 'Image & PDF Compressor',
    tagline: 'Shrink image or PDF file size to a target',
    description: 'Reduce image or PDF file size to a target size before you download.',
    icon: Minimize2,
    component: useImageCompressor,
    formats: ['IMG/PDF', 'SMALLER'],
    seoTitle: 'Image & PDF Compressor — Reduce File Size Free & Online',
    seoDescription:
      'Compress JPG, PNG, WebP images and PDF files to a target size for free. Runs entirely in your browser — no uploads, no watermarks.',
    keywords: 'image compressor, compress jpg, reduce image size, compress pdf, pdf compressor, compress png online',
    intro:
      'Shrink image or PDF file sizes down to a target for free, right in your browser. Perfect for speeding up websites, meeting upload limits, or emailing files — all without uploading anything to a server.',
    howTo: [
      'Drop your image (JPG, PNG, WebP) or PDF into the box above.',
      'Pick a target output size.',
      'Download the smaller, optimized file.',
    ],
    faq: [
      {
        q: 'How can I reduce image file size without losing quality?',
        a: 'Pick a target size close to the original — the tool only lowers quality as much as needed to reach it. Compression happens locally in your browser.',
      },
      {
        q: 'Can I compress a PDF file?',
        a: 'Yes. Drop in a PDF and pick a target size — each page is recompressed to fit, and a smaller PDF is rebuilt for you to download. Note that any selectable text becomes part of a page image in the process.',
      },
      {
        q: 'Is this compressor free?',
        a: 'Yes, it is completely free with no watermarks and no sign-up required.',
      },
    ],
  },
  {
    id: 'images-to-pdf',
    category: 'pdf',
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
    category: 'pdf',
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
    category: 'pdf',
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
    category: 'pdf',
    path: '/tools/pdf-to-word',
    name: 'PDF to Word',
    tagline: 'Word, PowerPoint, HTML, RTF or text',
    description:
      'Turn a PDF into an editable Word, PowerPoint, HTML or RTF file with the Studio PDF engine, or pull out plain text.',
    icon: FileText,
    component: usePdfToWord,
    formats: ['PDF', 'DOCX', 'PPTX', 'HTML', 'RTF', 'TXT'],
    seoTitle: 'PDF to Word — Convert PDF to Editable DOCX, PowerPoint or Text Free',
    seoDescription:
      'Convert a PDF into an editable Word (.docx), PowerPoint (.pptx), HTML or RTF file, or extract plain text, for free. Runs in your browser, no uploads, no sign-up.',
    keywords:
      'pdf to word, pdf to docx, convert pdf to word, pdf to powerpoint, pdf to pptx, pdf to html, pdf to rtf, pdf to text, extract text from pdf, pdf to txt',
    intro:
      'Convert a PDF into an editable Word document, PowerPoint deck, web page or RTF file, or extract its plain text, for free. Conversion uses the Studio PDF engine, the same processor as our PDF Editor, running entirely in your browser: your PDF is never uploaded and there is no file size limit.',
    howTo: [
      'Drop your PDF into the box above.',
      'Choose Word, PowerPoint, Web page, Rich text or Plain text in the panel on the right.',
      'Download the converted file.',
    ],
    faq: [
      {
        q: 'How do I convert a PDF to an editable Word document?',
        a: 'Upload your PDF, choose "Word (.docx)", and download a file with real paragraphs, headings, bold and italic text, colours, tables and images, ready to edit in Word or Google Docs.',
      },
      {
        q: 'Can I convert a PDF to PowerPoint?',
        a: 'Yes. Choose "PowerPoint (.pptx)" and each PDF page becomes an editable slide.',
      },
      {
        q: 'How do I just extract the text from a PDF?',
        a: 'Choose "Plain text (.txt)" — it pulls the words out in reading order, with no formatting.',
      },
      {
        q: 'Is the formatting preserved?',
        a: 'Paragraphs, headings, inline bold and italic, colours, tables and images are rebuilt. Scanned (image-only) PDFs have no text to extract.',
      },
      {
        q: 'Is my file uploaded anywhere?',
        a: 'No. The Studio PDF engine runs inside your browser (it downloads once, about 2.6 MB), so your PDF never leaves your device.',
      },
    ],
  },
  {
    id: 'word-to-pdf',
    category: 'pdf',
    path: '/tools/word-to-pdf',
    name: 'Word to PDF',
    tagline: 'Word, ODT, RTF, Markdown to PDF',
    description: 'Convert Word, ODT, RTF, Markdown, HTML or text documents to PDF with real page layout, using the Studio Word engine.',
    icon: FileOutput,
    component: useDocxToPdf,
    formats: ['DOCX', 'DOC', 'ODT', 'RTF', 'MD', 'PDF'],
    seoTitle: 'Word to PDF — Convert DOCX, DOC, ODT or RTF to PDF Free Online',
    seoDescription:
      'Convert Word documents (.docx, .doc), OpenDocument (.odt), RTF, Markdown and HTML to PDF for free, right in your browser, with true page layout. No uploads, no sign-up.',
    keywords: 'word to pdf, docx to pdf, doc to pdf, odt to pdf, rtf to pdf, markdown to pdf, convert word to pdf online',
    intro:
      'Convert a Word document (.docx or .doc), OpenDocument text, RTF, Markdown, HTML or plain text into a PDF for free. The Studio Word engine, the same page layout as our Word Processor, runs entirely in your browser, so your file never leaves your device.',
    howTo: [
      'Drop your document into the box above.',
      'The Studio Word engine lays it out page by page, as Word would.',
      'Download your PDF.',
    ],
    faq: [
      {
        q: 'How do I convert a Word document to PDF for free?',
        a: 'Upload your file above and download the PDF. It is free, with no watermark, and the file is processed on your device.',
      },
      {
        q: 'Is the formatting preserved?',
        a: 'Yes: fonts, headings, lists, tables, images, headers and footers, columns and your page size are laid out by a real word-processor layout engine.',
      },
      {
        q: 'Which file types can I convert?',
        a: 'Word (.docx and .doc), OpenDocument text (.odt), Rich Text (.rtf), Markdown (.md), HTML and plain text (.txt).',
      },
      {
        q: 'Is my document uploaded to a server?',
        a: 'No. The Studio Word engine runs inside your browser (it downloads once, about 5 MB), so your file stays private.',
      },
    ],
  },
  {
    id: 'pdf-read-aloud',
    category: 'pdf',
    path: '/tools/pdf-read-aloud',
    name: 'PDF Read Aloud',
    tagline: 'Text-to-speech, page by page',
    description: 'Have a PDF read aloud page by page using your browser\'s text-to-speech, with voice and speed controls.',
    icon: Volume2,
    component: usePdfReadAloud,
    formats: ['PDF', 'AUDIO'],
    seoTitle: 'PDF Read Aloud — Text-to-Speech PDF Reader Free Online',
    seoDescription:
      'Listen to any PDF read aloud, page by page, for free. Pick a page, choose a voice and speed, and play. Runs entirely in your browser — no uploads.',
    keywords: 'pdf read aloud, pdf text to speech, pdf reader, listen to pdf, pdf audio reader',
    intro:
      'Have any PDF read aloud for free, right in your browser. Jump to any page, pick a voice and reading speed, and press play — your browser\'s built-in speech engine does the rest. Nothing is uploaded; the PDF is read and spoken entirely on your device.',
    howTo: [
      'Drop your PDF into the box above — its text is extracted page by page.',
      'Use the page controls to jump to the page you want read.',
      'Pick a voice and speed in the settings, then press play.',
    ],
    faq: [
      {
        q: 'How do I have a PDF read aloud for free?',
        a: 'Upload your PDF above, choose the page you want, and press play. Your browser\'s built-in text-to-speech reads it aloud — no app or sign-up needed.',
      },
      {
        q: 'Can I choose a different voice or reading speed?',
        a: 'Yes. The available voices depend on your browser and operating system, and you can adjust the speed from 0.5x to 2x.',
      },
      {
        q: 'Does it work on scanned PDFs?',
        a: 'Only PDFs with an existing text layer can be read aloud. Scanned image-only pages have no extractable text.',
      },
      {
        q: 'Is my PDF uploaded anywhere?',
        a: 'No. Text extraction and speech both happen locally in your browser, so your document stays private.',
      },
    ],
  },
  {
    id: 'csv-json',
    category: 'utilities',
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
    category: 'utilities',
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
    category: 'utilities',
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
  {
    id: 'url-shortener',
    category: 'utilities',
    usesServer: true, // sends data to a server (excluded from the 'never upload' count)
    path: '/tools/url-shortener',
    name: 'URL Shortener',
    tagline: 'Turn a long link into a short one',
    description: 'Shorten a long URL into a short fileflowhq.com link you can copy and share.',
    icon: Link2,
    component: useUrlShortener,
    formats: ['URL', 'SHORT'],
    seoTitle: 'URL Shortener — Shorten Links Free, No Sign-up',
    seoDescription:
      'Shorten long URLs into short, shareable fileflowhq.com links for free. No account, no sign-up. The URL is stored on our server so the link can redirect.',
    keywords: 'url shortener, shorten url, short link, link shortener, free url shortener, shorten link',
    intro:
      'Paste a long link and get a short fileflowhq.com link that redirects to it, for free and with no account. Unlike most FileFlowHQ tools, this one needs our server: the URL you enter is stored so the short link can send people to it.',
    howTo: [
      'Paste the long URL (it must start with http:// or https://).',
      'Click Shorten URL.',
      'Copy the short link and share it anywhere.',
    ],
    faq: [
      {
        q: 'Is the URL shortener free?',
        a: 'Yes. There is no account, no sign-up, and no fee.',
      },
      {
        q: 'Is my URL sent to a server?',
        a: 'Yes. Unlike most tools on FileFlowHQ, a short link can only work if we store the original URL, so it is saved on our server. Do not shorten links that contain private tokens or passwords.',
      },
      {
        q: 'Do short links expire?',
        a: 'No, short links do not expire. We may remove links that are used for spam, phishing, or other abuse.',
      },
    ],
  },
]

export const getToolById = (id) => tools.find((t) => t.id === id)
