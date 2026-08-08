function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Table-based, inline-styled markup — Gmail/Outlook/Apple Mail strip <style>
// blocks and mishandle flexbox/grid, so this can't reuse the app's Tailwind
// classes. Mirrors the in-app brand: signal green, rounded card, "F" badge.
function buildConfirmationHtml(fileName) {
  const safeName = fileName ? escapeHtml(fileName) : null
  const signal = '#0e8f5c'
  const signalDim = '#eaf6f0'
  const ink = '#10151a'
  const inkDim = '#5b6670'
  const border = '#dbe1de'

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f6f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:16px; border:1px solid ${border}; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
                  <tr>
                    <td style="width:44px; height:44px; border-radius:12px; background-color:${signal}; font-size:22px; font-weight:700; color:#ffffff; text-align:center; vertical-align:middle;">
                      F
                    </td>
                  </tr>
                </table>
                <div style="display:inline-block; padding:6px 14px; border-radius:999px; background-color:${signalDim}; color:${signal}; font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:16px;">
                  ✓ Conversion complete
                </div>
                <h1 style="margin:0 0 12px 0; font-size:22px; line-height:1.3; color:${ink}; font-weight:700;">
                  Your file is ready! 🎉
                </h1>
                <p style="margin:0; font-size:15px; line-height:1.6; color:${inkDim};">
                  ${
                    safeName
                      ? `<strong style="color:${ink};">${safeName}</strong> was converted successfully and downloaded straight to your device.`
                      : 'Your file was converted successfully and downloaded straight to your device.'
                  }
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbfcfb; border:1px solid ${border}; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px; font-size:13px; line-height:1.6; color:${inkDim};">
                      🔒 Everything happened locally in your browser — nothing was uploaded to a server. This email is just a receipt.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px; text-align:center;">
                <a href="https://fileflowhq.com" style="display:inline-block; padding:12px 28px; background-color:${signal}; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; border-radius:10px;">
                  Convert another file
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid ${border}; text-align:center;">
                <p style="margin:0; font-size:12px; color:${inkDim};">
                  Sent by FileFlowHQ · fileflowhq.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

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

  const subject = fileName ? `"${fileName}" is ready 🎉` : 'Your file conversion is ready 🎉'
  const textPart = fileName
    ? `Your file "${fileName}" was converted successfully on FileFlowHQ.`
    : 'Your file was converted successfully on FileFlowHQ.'
  const htmlPart = buildConfirmationHtml(fileName)

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
            To: [{ Email: email }],
            Subject: subject,
            TextPart: textPart,
            HTMLPart: htmlPart,
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
