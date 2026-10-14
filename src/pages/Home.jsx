import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ShieldCheck, WifiOff, Sparkles, Smartphone, UploadCloud, Wand2, Download } from 'lucide-react'
import { tools, categories } from '../toolsConfig.js'
import ToolCard from '../components/ToolCard.jsx'
import { applySeo } from '../utils/useSeo.js'

const localCount = tools.filter((t) => !t.usesServer).length

const steps = [
  { icon: UploadCloud, title: 'Drop your file', body: 'Drag it in or tap to pick from your device — photos, PDFs, SVGs, spreadsheets.' },
  { icon: Wand2, title: 'Pick your output', body: 'Choose a format, size, or quality. Sensible defaults if you just want it done.' },
  { icon: Download, title: 'Download instantly', body: 'Processing happens on your device, so results are ready in seconds.' }
]

const features = [
  { icon: ShieldCheck, title: 'Private by design', body: `${localCount} of ${tools.length} tools never upload your file anywhere.` },
  { icon: WifiOff, title: 'Works offline', body: 'Once the page has loaded, conversions keep working without a connection.' },
  { icon: Sparkles, title: 'Free, no watermarks', body: 'No sign-up, no limits on quality, nothing stamped on your files.' },
  { icon: Smartphone, title: 'Install as an app', body: 'Add FileFlowHQ to your home screen or desktop for one-tap access.' }
]

export default function Home() {
  const reduce = useReducedMotion()

  useEffect(() => {
    applySeo({
      title: null,
      description:
        'Convert images, PDFs, and data files for free, right in your browser. PNG/JPG/WebP conversion, SVG to PNG, image compression, PDF to images, merge/split PDF, CSV to JSON and back. Almost everything runs locally in your browser, with no tracking.',
      path: '/'
    })
  }, [])

  const fadeUp = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  }
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.04, delayChildren: 0.1 } }
  }

  return (
    <div>
      {/* Hero + every tool, sized to fit the first screen on a laptop */}
      <section className="relative overflow-hidden bg-gradient-to-b from-signal-dim via-transparent to-transparent">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-signal opacity-[0.12] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-mono-text opacity-[0.08] blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-7 max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-panel px-3 py-1 text-[0.72rem] font-medium text-text-dim shadow-card">
              <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
              Free · private · no sign-up
            </span>
            <h1 className="text-[clamp(1.85rem,4vw,3rem)] font-bold leading-[1.08] tracking-tight">
              Convert any file,{' '}
              <span className="bg-gradient-to-r from-signal to-mono-text bg-clip-text text-transparent">right on your device.</span>
            </h1>
            <p className="mt-2.5 max-w-[60ch] text-[0.95rem] leading-relaxed text-text-dim">
              Images, PDFs, SVGs and data files — converted in your browser in seconds. Your files never
              have to leave your device.
            </p>
          </motion.div>

          <div id="tools" className="grid scroll-mt-24 gap-6 md:grid-cols-3">
            {categories.map((cat) => {
              const list = tools.filter((t) => t.category === cat.id)
              return (
                <div key={cat.id}>
                  <div className="mb-2.5 flex items-baseline justify-between px-1">
                    <h2 className="text-[0.95rem] font-semibold tracking-tight">{cat.label}</h2>
                    <span className="text-[0.72rem] text-text-dim">{list.length} tools</span>
                  </div>
                  <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-2.5">
                    {list.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-signal">How it works</p>
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-tight tracking-tight">Three steps. No uploads. No waiting.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="relative rounded-card bg-panel p-7 shadow-card">
                <span className="absolute right-6 top-4 text-6xl font-bold leading-none text-signal opacity-[0.08]">{i + 1}</span>
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-dim text-signal">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mb-1.5 text-[1.05rem] font-semibold">{s.title}</h3>
                <p className="text-[0.88rem] leading-relaxed text-text-dim">{s.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features on a tinted band */}
      <section className="bg-panel-raised">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8">
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-signal">Why FileFlowHQ</p>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-tight tracking-tight">
              Built for people who'd rather not upload their files.
            </h2>
            <p className="max-w-[48ch] text-[0.95rem] leading-relaxed text-text-dim">
              Most online converters send your documents to a server. FileFlowHQ does the work inside your
              browser instead — faster, private, and free.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-card bg-panel p-6 shadow-card">
                  <Icon className="mb-4 h-6 w-6 text-signal" strokeWidth={1.75} />
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-[0.86rem] leading-relaxed text-text-dim">{f.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[#0b0d10] px-8 py-14 text-center sm:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#39ff9e] opacity-20 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-tight tracking-tight text-white">
            Your files stay yours.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[0.95rem] text-[#a3adb5]">
            Pick a tool and convert your first file in seconds — no account needed.
          </p>
          <Link
            to="/#tools"
            className="relative mt-7 inline-flex rounded-full bg-[#39ff9e] px-7 py-3 text-[0.9rem] font-semibold text-[#0b0d10] transition-transform hover:-translate-y-0.5"
          >
            Browse all {tools.length} tools
          </Link>
        </div>
      </section>

      {/* Crawlable SEO copy — spells out the conversions in words with real
          links, giving search engines keyword-rich text and internal links. */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-[70ch] text-text-dim">
          <h2 className="mb-3 text-[1.1rem] font-semibold text-text">Free online file converter — private, no sign-up</h2>
          <p className="mb-4 text-[0.9rem] leading-relaxed">
            FileFlowHQ is a free file converter and toolkit that runs entirely in your browser. Convert{' '}
            <Link to="/tools/image-converter" className="text-signal hover:underline">
              PNG to JPG, JPG to PNG, and WebP images
            </Link>
            ,{' '}
            <Link to="/tools/svg-to-png" className="text-signal hover:underline">
              SVG to PNG
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
            . Almost every conversion happens locally on your device — your files aren't uploaded to a server,
            so your data stays private. (The exceptions are Word output in PDF to Word, which uses a secure cloud
            API, and the URL shortener.)
          </p>
        </div>
      </section>
    </div>
  )
}
