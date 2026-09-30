import { handleCors } from './_cors.js'
import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFJob,
  ExportPDFParams,
  ExportPDFTargetFormat,
  ExportPDFResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
} from '@adobe/pdfservices-node-sdk'
import { Readable } from 'node:stream'

export const config = {
  api: {
    bodyParser: false,
    // Vercel's serverless gateway caps request bodies (~4.5MB by default on
    // the Node runtime); this tool accepts PDFs up to that ceiling.
    sizeLimit: '4.5mb',
  },
}

// Buffers the raw request body. bodyParser is disabled because the client
// sends the PDF as a raw octet-stream, not multipart/JSON.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { PDF_SERVICES_CLIENT_ID, PDF_SERVICES_CLIENT_SECRET } = process.env
  if (!PDF_SERVICES_CLIENT_ID || !PDF_SERVICES_CLIENT_SECRET) {
    console.error('Adobe PDF Services env vars are not configured.')
    return res.status(500).json({ error: 'PDF conversion is not configured.' })
  }

  const pdfBuffer = await readRawBody(req)
  if (pdfBuffer.length === 0) {
    return res.status(400).json({ error: 'No file was uploaded.' })
  }

  try {
    const credentials = new ServicePrincipalCredentials({
      clientId: PDF_SERVICES_CLIENT_ID,
      clientSecret: PDF_SERVICES_CLIENT_SECRET,
    })
    const pdfServices = new PDFServices({ credentials })

    const inputAsset = await pdfServices.upload({
      readStream: Readable.from(pdfBuffer),
      mimeType: MimeType.PDF,
    })

    const params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.DOCX })
    const job = new ExportPDFJob({ inputAsset, params })

    const pollingURL = await pdfServices.submit({ job })
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFResult,
    })

    const resultAsset = pdfServicesResponse.result.asset
    const streamAsset = await pdfServices.getContent({ asset: resultAsset })

    const outChunks = []
    for await (const chunk of streamAsset.readStream) {
      outChunks.push(chunk)
    }
    const docxBuffer = Buffer.concat(outChunks)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return res.status(200).send(docxBuffer)
  } catch (err) {
    if (err instanceof ServiceUsageError) {
      console.error('Adobe PDF Services usage limit reached:', err)
      return res.status(429).json({ error: 'Conversion limit reached. Please try again later.' })
    }
    if (err instanceof ServiceApiError || err instanceof SDKError) {
      console.error('Adobe PDF Services error:', err)
      return res.status(502).json({ error: 'Could not convert this PDF. It may be corrupted or unsupported.' })
    }
    console.error('Unexpected error during PDF conversion:', err)
    return res.status(500).json({ error: 'Could not convert this PDF.' })
  }
}
