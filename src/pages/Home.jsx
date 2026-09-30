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
      <section className="relative flex-shrink-0 overflow-hidden border-b border-border px-6 py-8 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 20% 20%, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 20% 20%, black, transparent 75%)'
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="relative max-w-[780px]"
        >
          <span className="mb-3.5 inline-flex items-center gap-2 rounded-[3px] border border-signal-dim bg-signal-dim px-[0.7rem] py-[0.3rem] font-mono text-[0.64rem] uppercase tracking-[0.16em] text-mono-text">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_6px_var(--signal)]" />
            Mostly local processing
          </span>

          <h1 className="font-display mb-3 max-w-[22ch] text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-[1.08] tracking-wide">
            Every file, <span className="text-signal">re-encoded</span> on your machine.
          </h1>

          <p className="mb-5 max-w-[52ch] font-body text-[0.92rem] normal-case text-text-dim">
            FileFlowHQ reads, decodes, and re-writes images, PDFs, and data files in your browser.
            Nearly every tool runs locally, so your files stay on your device.
          </p>

          <div className="flex flex-wrap gap-8">
            {stats.map((s) => (
              <div key={s.l}>
                <div className="mb-1 font-mono text-xl font-semibold leading-none text-signal">{s.n}</div>
                <div className="max-w-[18ch] text-[0.72rem] leading-snug text-text-dim">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Tools grid */}
      <section className="flex flex-1 flex-col px-6 pt-6 sm:px-10">
        <div className="mb-3.5 flex flex-shrink-0 items-baseline justify-between">
          <h2 className="font-display text-[1.05rem] font-semibold tracking-wide">All tools</h2>
          <span className="font-mono text-[0.72rem] text-text-dim">{tools.length} available</span>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={gridVariants}
          className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
          <h2 className="font-display mb-3 text-[1.1rem] font-semibold tracking-wide text-text">
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
          <h3 className="mb-2 font-display text-[0.95rem] font-semibold tracking-wide text-text">
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
