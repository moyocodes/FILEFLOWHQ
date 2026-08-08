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
// classes. No external images (unreliable across clients/proxies) — the
// hero graphic is built entirely from nested tables/CSS shapes.
function buildConfirmationHtml(fileName) {
  const safeName = fileName ? escapeHtml(fileName) : null
  const displayName = safeName || 'your file'
  const ext = safeName && safeName.includes('.') ? safeName.split('.').pop().slice(0, 4).toUpperCase() : 'FILE'

  const signal = '#39ff9e'
  const void_ = '#0b0d10'
  const panel = '#171b21'
  const ink = '#10151a'
  const inkDim = '#5b6670'
  const border = '#dbe1de'

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#e9ece9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9ece9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 20px 40px -20px rgba(11,13,16,0.35);">

            <!-- Dark hero band -->
            <tr>
              <td style="background-color:${void_}; padding:40px 32px 36px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:28px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:32px; height:32px; border-radius:9px; background-color:${signal}; font-size:16px; font-weight:700; color:${void_}; text-align:center; vertical-align:middle; font-family:-apple-system,sans-serif;">
                            F
                          </td>
                          <td style="padding-left:10px; font-size:13px; font-weight:700; letter-spacing:0.02em; color:#ffffff;">
                            FileFlowHQ
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- File-transform graphic: document card -> arrow -> checkmark badge -->
                  <tr>
                    <td align="center" style="padding-bottom:26px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="width:84px; height:100px; border-radius:12px; background-color:${panel}; border:1px solid #262c34; text-align:center;">
                            <div style="font-size:10px; font-weight:700; letter-spacing:0.04em; color:${signal}; margin-top:34px;">${ext}</div>
                          </td>
                          <td style="width:36px; text-align:center; font-size:20px; color:#3a4048;">
                            &#8594;
                          </td>
                          <td valign="middle" style="width:84px; height:100px; border-radius:12px; background-color:${signal}; text-align:center;">
                            <div style="font-size:30px; line-height:100px; color:${void_};">&#10003;</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center">
                      <h1 style="margin:0; font-size:24px; line-height:1.3; color:#ffffff; font-weight:700; text-align:center;">
                        Your file is ready
                      </h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:32px 32px 8px 32px; text-align:center;">
                <p style="margin:0; font-size:15px; line-height:1.6; color:${ink};">
                  <strong>${displayName}</strong> was converted successfully and downloaded straight to your device.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f9f6; border:1px solid #d7ecdf; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px; font-size:13px; line-height:1.6; color:${inkDim};">
                      🔒&nbsp; Everything happened locally in your browser — nothing was uploaded to a server. This email is just a receipt.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px; text-align:center;">
                <a href="https://fileflowhq.com" style="display:inline-block; padding:13px 30px; background-color:${void_}; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; border-radius:10px;">
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
