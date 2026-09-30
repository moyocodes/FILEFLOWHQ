import { handleCors } from './_cors.js'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Table-based, inline-styled markup — Gmail/Outlook/Apple Mail strip <style>
// blocks, mishandle flexbox/grid, and routinely drop @font-face/Google Fonts
// links, so this reuses neither the app's Tailwind classes nor its Fredoka/
// Quicksand pairing — only its exact light-theme color tokens (see
// src/index.css :root) and a rounder, friendlier shape language to match the
// in-app redesign. No external images (unreliable across clients/proxies) —
// the hero graphic is built entirely from nested tables/CSS shapes.
function buildConfirmationHtml(fileName, toolName) {
  const safeName = fileName ? escapeHtml(fileName) : null
  const safeToolName = toolName ? escapeHtml(toolName) : null
  const displayName = safeName || 'your file'
  const ext = safeName && safeName.includes('.') ? safeName.split('.').pop().slice(0, 4).toUpperCase() : 'FILE'
  const sysFont = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

  // Exact light-theme tokens from src/index.css :root
  const outerBg = '#e4e9e4'
  const panel = '#ffffff'
  const panelRaised = '#fbfcfb'
  const signal = '#0e8f5c'
  const signalDim = '#eaf6f0'
  const text = '#10151a'
  const textDim = '#5b6670'
  const border = '#dbe1de'

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:${outerBg}; font-family:${sysFont};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${outerBg}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; background-color:${panel}; border-radius:28px; overflow:hidden; box-shadow:0 24px 48px -24px rgba(16,21,26,0.22);">

            <!-- Hero: signal-green band, rounded shapes echoing the app's redesign -->
            <tr>
              <td style="background-color:${signal}; padding:36px 32px 34px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:26px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:34px; height:34px; border-radius:11px; background-color:#ffffff; font-size:17px; font-weight:700; color:${signal}; text-align:center; vertical-align:middle; font-family:${sysFont};">
                            F
                          </td>
                          <td style="padding-left:10px; font-size:14px; font-weight:700; letter-spacing:0.01em; color:#ffffff; font-family:${sysFont};">
                            FileFlowHQ
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- File-transform graphic: document card -> arrow -> checkmark badge -->
                  <tr>
                    <td align="center" style="padding-bottom:24px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="width:80px; height:96px; border-radius:20px; background-color:#ffffff; text-align:center;">
                            <div style="font-size:11px; font-weight:700; letter-spacing:0.04em; color:${signal}; margin-top:32px; font-family:${sysFont};">${ext}</div>
                          </td>
                          <td style="width:32px; text-align:center; font-size:20px; color:#ffffff;">
                            &#8594;
                          </td>
                          <td valign="middle" style="width:80px; height:96px; border-radius:20px; background-color:#ffffff; text-align:center;">
                            <div style="font-size:30px; line-height:96px; color:${signal};">&#10003;</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center">
                      <h1 style="margin:0; font-size:23px; line-height:1.3; color:#ffffff; font-weight:700; text-align:center; font-family:${sysFont};">
                        Your file is ready! 🎉
                      </h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:32px 32px 8px 32px; text-align:center;">
                <p style="margin:0; font-size:15px; line-height:1.6; color:${text}; font-family:${sysFont};">
                  <strong>${displayName}</strong> was converted successfully and downloaded straight to your device.
                </p>
                ${
                  safeToolName
                    ? `<p style="margin:8px 0 0 0; font-size:13px; color:${textDim}; font-family:${sysFont};">
                  Converted with <strong style="color:${text};">${safeToolName}</strong>
                </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${signalDim}; border-radius:16px;">
                  <tr>
                    <td style="padding:16px 20px; font-size:13px; line-height:1.6; color:${textDim}; font-family:${sysFont};">
                      <strong style="color:${text};">Private by design.</strong> Everything happened locally in your browser — nothing was uploaded to a server. This email is just a receipt.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px; text-align:center;">
                <a href="https://fileflowhq.com" style="display:inline-block; padding:13px 32px; background-color:${signal}; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; border-radius:999px; font-family:${sysFont};">
                  Convert another file
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:${panelRaised}; border-top:1px solid ${border}; text-align:center;">
                <p style="margin:0; font-size:12px; color:${textDim}; font-family:${sysFont};">
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
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, fileName, toolName } = req.body || {}
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
  const toolSuffix = toolName ? ` with ${toolName}` : ''
  const textPart = fileName
    ? `Your file "${fileName}" was converted successfully${toolSuffix} on FileFlowHQ.`
    : `Your file was converted successfully${toolSuffix} on FileFlowHQ.`
  const htmlPart = buildConfirmationHtml(fileName, toolName)

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
