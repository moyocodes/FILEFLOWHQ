// Vercel serverless function. Keeps the Mailjet private key server-side —
// it must never be bundled into client code (see .env.example).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, fileName } = req.body || {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof email !== 'string' || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' })
  }

  const { MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MJ_SENDER_EMAIL } = process.env
  if (!MJ_APIKEY_PUBLIC || !MJ_APIKEY_PRIVATE || !MJ_SENDER_EMAIL) {
    console.error('Mailjet env vars are not configured.')
    return res.status(500).json({ error: 'Email sending is not configured.' })
  }

  const subject = fileName ? `Your file "${fileName}" is ready` : 'Your file conversion is ready'
  const textPart = fileName
    ? `Your file "${fileName}" was converted successfully on Convertly.`
    : 'Your file was converted successfully on Convertly.'

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
            From: { Email: MJ_SENDER_EMAIL, Name: 'Convertly' },
            To: [{ Email: email }],
            Subject: subject,
            TextPart: textPart,
          },
        ],
      }),
    })

    if (!mjResponse.ok) {
      const detail = await mjResponse.text()
      console.error('Mailjet send failed:', mjResponse.status, detail)
      return res.status(502).json({ error: 'Could not send confirmation email.' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Mailjet request error:', err)
    return res.status(502).json({ error: 'Could not send confirmation email.' })
  }
}
