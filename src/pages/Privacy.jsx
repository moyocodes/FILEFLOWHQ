import { useEffect } from 'react'
import { applySeo } from '../utils/useSeo.js'

const UPDATED = 'October 14, 2026'

function Section({ title, children }) {
  return (
    <section className="rounded-card bg-panel p-6 shadow-card sm:p-7">
      <h2 className="mb-2 text-[1.05rem] font-medium tracking-tight">{title}</h2>
      <div className="space-y-3 text-[0.9rem] leading-relaxed text-text-dim">{children}</div>
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
    <div>
      <section className="bg-gradient-to-b from-signal-dim to-transparent">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-12 sm:px-6">
          <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-signal">Last updated {UPDATED}</p>
          <h1 className="text-[clamp(1.8rem,3.4vw,2.5rem)] font-medium leading-tight tracking-tight">Privacy Policy</h1>
          <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-text-dim">
            This policy covers the FileFlowHQ website (fileflowhq.com), its mobile apps, and its Chrome extension.
            In short: almost everything happens on your device, and the few things that don&apos;t are listed below.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-20 sm:px-6">

      <Section title="Your files stay on your device">
        <p>
          Image conversion (including iPhone HEIC photos), SVG to PNG, image and PDF compression, Images to PDF,
          PDF to Images, Merge and Split PDF, Word to PDF, PDF Read Aloud, the Document and QR scanners, and
          CSV/JSON conversion all run entirely in your browser. Those files are never uploaded to our servers.
        </p>
        <p>
          The scanners use your camera only while the scanner is open, and the video never leaves your device.
          On iPhone and iPad, downloads open the system share sheet so you can save to Files or Photos; the file
          goes straight from your browser to the place you choose.
        </p>
      </Section>

      <Section title="Studio editors">
        <p>
          The Studio editors (PDF Editor, Photo Editor, Video Editor and the others) run entirely in your browser.
          Documents you open or create in them are never uploaded. When you save or export, the file goes from the
          editor to this page on your device and is downloaded from there.
        </p>
      </Section>

      <Section title="Payments and credits">
        <p>
          Some features use credits. To count them without accounts, we store a one-way hash of your IP address
          with your credit balance; the IP address itself is never stored. When you buy credits, the payment is
          processed by Paystack: you enter your card or bank details on Paystack&apos;s checkout, never on our
          site, and we never see or store them. We send Paystack the email address you give for your receipt and
          keep the payment reference so we can credit your balance. Paystack handles your payment under its own
          terms and privacy policy.
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
          The website uses Vercel Web Analytics and its own simple, cookie-free counters to understand which
          tools are used. When you open a page, add a file to a tool, download a result, or see an error, we
          count it, along with the referring website, your device type (mobile, tablet or desktop) and your
          country (from our host&apos;s location data). We never record file names or contents. To count unique
          visitors without cookies we use a one-way hash of your IP address and browser that changes every day;
          the IP address itself is never stored. The Chrome extension and mobile apps do not include analytics.
        </p>
        <p>
          The website loads its fonts from Google Fonts, so your browser contacts Google&apos;s servers (which
          see your IP address) when the page loads. No file you convert is ever sent with that request.
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
          eligibility. We do not transfer it to third parties except the service providers named above (Mailjet for email, Paystack for payments, Upstash for storing credit balances and short
          links, Vercel for hosting and analytics, Google Fonts for typefaces),
          solely to provide the features you use.
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

      </div>
    </div>
  )
}
