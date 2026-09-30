import { useEffect } from 'react'
import { applySeo } from '../utils/useSeo.js'

const UPDATED = 'September 30, 2026'

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-display mb-2 text-lg tracking-wide">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-text-dim">{children}</div>
    </section>
  )
}

export default function Privacy() {
  useEffect(() => {
    applySeo({
      title: 'Privacy Policy',
      description:
        'How FileFlowHQ handles your files and data: most conversions run in your browser, and the few features that use a server are listed here.',
      path: '/privacy',
    })
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:px-9">
      <h1 className="font-display text-3xl tracking-wide">Privacy Policy</h1>
      <p className="mt-2 font-mono text-[0.7rem] text-text-dim">Last updated {UPDATED}</p>
      <p className="mt-6 text-sm leading-relaxed text-text-dim">
        This policy covers the FileFlowHQ website (fileflowhq.com), its mobile apps, and its Chrome extension.
        In short: almost everything happens on your device, and the few things that don&apos;t are listed below.
      </p>

      <Section title="Your files stay on your device">
        <p>
          Image conversion and compression, Images to PDF, PDF to Images, Merge and Split PDF, Word to PDF,
          PDF Read Aloud, the scanners, and CSV/JSON conversion all run entirely in your browser. Those files
          are never uploaded to our servers.
        </p>
      </Section>

      <Section title="The one feature that uploads a file: PDF to Word">
        <p>
          When you choose Word (.docx) output in PDF to Word, the PDF is sent to our server, which passes it to
          Adobe PDF Services to perform the conversion, and the result is returned to you. We do not keep the
          file: it is used only to produce your conversion. The plain-text extraction option runs in your
          browser and uploads nothing. Adobe processes the file under its own terms and privacy policy.
        </p>
      </Section>

      <Section title="URL shortener">
        <p>
          The URL Shortener stores the web address you enter so its short link can redirect to it. Short links do
          not expire. We do not attach your name or email to a link. For abuse prevention we use your IP address
          briefly to limit how many links can be created per minute; it is not kept with the link. We may remove
          links used for spam, phishing, or other abuse. Do not shorten links that contain private tokens or
          passwords.
        </p>
      </Section>

      <Section title="Your email address">
        <p>
          When you download a file, we may ask for your email address. You can skip this. If you provide it, we
          use it only to send a confirmation email about that download (via our email provider, Mailjet). We do
          not sell it, share it for marketing, or send you promotions. The address is stored in your browser on
          your device so you aren&apos;t asked repeatedly; clear your browser data to remove it.
        </p>
      </Section>

      <Section title="Contact messages">
        <p>
          If you send us a message through the contact form, we receive your message and the email address you
          entered so we can reply. It is delivered through Mailjet.
        </p>
      </Section>

      <Section title="Analytics (website only)">
        <p>
          The website uses Vercel Web Analytics to count page views. It does not use cookies to track you across
          sites. The Chrome extension does not include analytics and does not track your activity.
        </p>
      </Section>

      <Section title="Chrome extension permissions">
        <p>
          The extension requests only the <em>sidePanel</em> permission, to show the tools in Chrome&apos;s side
          panel. It does not read the pages you visit, your browsing history, or your tabs.
        </p>
      </Section>

      <Section title="What we don't do">
        <p>
          We do not sell your data, use it for advertising, or use it to determine creditworthiness or lending
          eligibility. We do not transfer it to third parties except the service providers named above (Adobe
          for PDF to Word, Mailjet for email, Vercel for hosting), solely to provide the features you use.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If this policy changes, we&apos;ll update the date above. Questions? Email{' '}
          <a href="mailto:moyosorejames@gmail.com" className="text-signal underline">
            moyosorejames@gmail.com
          </a>{' '}
          or use the <a href="/contact" className="text-signal underline">contact page</a>.
        </p>
      </Section>

      <footer className="mt-10 border-t border-border pt-6">
        <p className="font-mono text-[0.65rem] text-text-dim">&copy; 2026 James Moyosore. All Rights Reserved.</p>
      </footer>
    </main>
  )
}
