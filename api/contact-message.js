import { handleCors } from './_cors.js'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ADMIN_EMAIL = 'moyosorejames@gmail.com'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Vercel serverless function. Reuses the same Mailjet credentials as
// api/send-confirmation.js to relay a visitor's message to the site admin —
// an async "email live chat" rather than real-time chat infrastructure.
export default async function handler(req, res) {
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, message } = req.body || {}
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' })
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' })
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: 'Message is too long.' })
  }

  const { MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MJ_SENDER_EMAIL } = process.env
  if (!MJ_APIKEY_PUBLIC || !MJ_APIKEY_PRIVATE || !MJ_SENDER_EMAIL) {
    console.error('Mailjet env vars are not configured.')
    return res.status(500).json({ error: 'Message sending is not configured.' })
  }

  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')

  try {
    const mjResponse = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${MJ_APIKEY_PUBLIC}:${MJ_APIKEY_PRIVATE}`).toString('base64')}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: MJ_SENDER_EMAIL, Name: 'FileFlowHQ' },
            To: [{ Email: ADMIN_EMAIL, Name: 'FileFlowHQ Admin' }],
            ReplyTo: { Email: email },
            Subject: `New message from ${email}`,
            TextPart: `From: ${email}\n\n${message}`,
            HTMLPart: `<p><strong>From:</strong> ${safeEmail}</p><p>${safeMessage}</p>`,
          },
        ],
      }),
    })

    if (!mjResponse.ok) {
      const detail = await mjResponse.text()
      console.error('Mailjet send failed:', mjResponse.status, detail)
      return res.status(502).json({ error: 'Could not send your message.' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Mailjet request error:', err)
    return res.status(502).json({ error: 'Could not send your message.' })
  }
}
