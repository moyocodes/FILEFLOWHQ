import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { tools } from '../toolsConfig.js'
import ToolCard from '../components/ToolCard.jsx'
import { applySeo } from '../utils/useSeo.js'

const stats = [
  { n: String(tools.length), l: 'Conversion tools, one page' },
  { n: '10', l: 'Tools that never upload a file' },
  { n: '100%', l: 'Runs offline once loaded' }
]

export default function Home() {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    applySeo({
      title: null,
      description:
        'Convert images, PDFs, and data files for free, right in your browser. PNG/JPG/WebP conversion, image compression, PDF to images, merge/split PDF, CSV to JSON and back. Almost everything runs locally in your browser, with no tracking.',
      path: '/'
    })
  }, [])

  const heroVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  }

  const gridVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06, delayChildren: 0.1 }
    }
  }

  return (
    <div className="flex min-h-full flex-col pb-6">
      {/* Hero */}
      <section className="relative flex-shrink-0 overflow-hidden border-b border-border px-6 py-14 sm:px-10 sm:py-20">
        {/* Layered ambient glow + fine grid for depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 10% 0%, var(--signal-dim), transparent 70%), radial-gradient(40% 60% at 90% 10%, var(--signal-dim), transparent 70%)'
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-signal opacity-[0.12] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 30% 30%, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 30% 30%, black, transparent 75%)'
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="relative max-w-[820px]"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-[color-mix(in_srgb,var(--panel)_70%,transparent)] px-3 py-1 text-[0.75rem] font-medium text-text-dim shadow-card backdrop-blur">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
            Mostly local processing · free · no sign-up
          </span>

          <h1 className="mb-4 max-w-[20ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
            Every file,{' '}
            <span className="bg-gradient-to-r from-signal to-mono-text bg-clip-text text-transparent">re-encoded</span>{' '}
            on your machine.
          </h1>

          <p className="mb-8 max-w-[56ch] text-[1rem] leading-relaxed text-text-dim">
            FileFlowHQ reads, decodes, and re-writes images, PDFs, and data files in your browser.
            Nearly every tool runs locally, so your files stay on your device.
          </p>

          <div className="grid max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.l} className="rounded-card border border-border bg-[color-mix(in_srgb,var(--panel)_70%,transparent)] px-4 py-3.5 shadow-card backdrop-blur">
                <div className="mb-1 text-2xl font-bold leading-none tracking-tight text-signal">{s.n}</div>
                <div className="text-[0.78rem] leading-snug text-text-dim">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Tools grid */}
      <section className="flex flex-1 flex-col px-6 pt-10 sm:px-10">
        <div className="mb-5 flex flex-shrink-0 items-center justify-between">
          <h2 className="text-[1.25rem] font-semibold tracking-tight">All tools</h2>
          <span className="rounded-full bg-signal-dim px-2.5 py-0.5 text-[0.75rem] font-medium text-mono-text">{tools.length} available</span>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={gridVariants}
          className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        >
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </motion.div>
      </section>

      {/* Crawlable SEO copy — spells out the conversions in words with real
          links, giving search engines keyword-rich text and internal links. */}
      <section className="mt-10 border-t border-border px-6 pt-8 sm:px-10">
        <div className="max-w-[70ch] text-text-dim">
          <h2 className="mb-3 text-[1.1rem] font-semibold text-text">
            Free online file converter — private, no sign-up
          </h2>
          <p className="mb-4 text-[0.9rem] leading-relaxed">
            FileFlowHQ is a free file converter and toolkit that runs entirely in your
            browser. Convert{' '}
            <Link to="/tools/image-converter" className="text-signal hover:underline">
              PNG to JPG, JPG to PNG, and WebP images
            </Link>
            ,{' '}
            <Link to="/tools/image-compressor" className="text-signal hover:underline">
              compress and resize images
            </Link>
            ,{' '}
            <Link to="/tools/images-to-pdf" className="text-signal hover:underline">
              turn images into a PDF
            </Link>
            ,{' '}
            <Link to="/tools/pdf-to-images" className="text-signal hover:underline">
              convert PDF pages to images
            </Link>
            ,{' '}
            <Link to="/tools/merge-split-pdf" className="text-signal hover:underline">
              merge or split PDFs
            </Link>
            ,{' '}
            <Link to="/tools/pdf-to-word" className="text-signal hover:underline">
              extract text from a PDF
            </Link>
            , and{' '}
            <Link to="/tools/csv-json" className="text-signal hover:underline">
              convert CSV to JSON and back
            </Link>
            . Almost every conversion happens locally on your device — your files aren't
            uploaded to a server, so your data stays private. (The one exception is Word
            conversion in PDF to Word, which uses a secure cloud API.)
          </p>
          <h3 className="mb-2 text-[0.95rem] font-semibold text-text">
            Why FileFlowHQ?
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[0.88rem] leading-relaxed">
            <li>
              <strong className="text-text">Private by design:</strong> almost every tool
              processes files in your browser and never uploads them.
            </li>
            <li>
              <strong className="text-text">Free, no sign-up, no watermarks.</strong>
            </li>
            <li>
              <strong className="text-text">Works offline</strong> once the page has
              loaded, and installs as an app on desktop and mobile.
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 sm:px-9">
        <p className="font-mono text-[0.65rem] text-text-dim">&copy; 2026 James Moyosore. All Rights Reserved.</p>
      </footer>
    </div>
  )
}
