import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Check, Volume2, VolumeX, Play } from 'lucide-react'
import { tools, categories } from '../toolsConfig.js'
import ToolCard from '../components/ToolCard.jsx'
import ExtensionButton from '../components/ExtensionButton.jsx'
import { CompressMock, MergeMock, ScanMock } from '../components/HomeMocks.jsx'
import { applySeo } from '../utils/useSeo.js'

/*
 * Home page. Structure follows Notion's (centered hero → product video →
 * sections); the look follows the FileFlowHQ launch video (near-black, mint
 * keyword highlights, floating format chips, speed lines, tilted app windows).
 */

const localCount = tools.filter((t) => !t.usesServer).length
const POPULAR = ['image-converter', 'svg-to-png', 'image-compressor', 'merge-split-pdf', 'pdf-to-word']
const CHIPS = [
  ['PNG', '8%', '22%', '-8deg', '7s', '0s'],
  ['JSON', '16%', '62%', '6deg', '8s', '1s'],
  ['CSV', '84%', '18%', '10deg', '6.5s', '0.5s'],
  ['DOCX', '90%', '58%', '-6deg', '7.5s', '1.5s'],
  ['JPG', '4%', '84%', '4deg', '9s', '0.8s'],
  ['TIFF', '78%', '86%', '-10deg', '8.5s', '0.2s'],
  ['SVG', '27%', '8%', '12deg', '6s', '1.2s'],
  ['PDF', '70%', '6%', '-4deg', '7s', '0.4s']
]

/** Section heading in the video's style: white, with one mint keyword. */
function Title({ before, accent, after, className = '' }) {
  return (
    <h2 className={`text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.1] tracking-tight ${className}`}>
      {before}
      <span className="text-signal">{accent}</span>
      {after}
    </h2>
  )
}

function Reveal({ children, className = '', delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Launch video in a tilted app window that straightens as it scrolls into view. */
function HeroVideo() {
  const ref = useRef(null)
  const videoRef = useRef(null)
  const reduce = useReducedMotion()
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(!reduce)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 18, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.9, 1])

  return (
    <div ref={ref} className="mx-auto max-w-5xl [perspective:1400px]">
      <motion.div style={{ rotateX, scale }} className="relative overflow-hidden rounded-[22px] bg-black shadow-[0_40px_120px_-30px_rgba(59,230,152,0.35)]">
        <video
          ref={videoRef}
          className="block aspect-video w-full"
          src="/launch-720.mp4"
          poster="/launch-poster.jpg"
          autoPlay={!reduce}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label="FileFlowHQ launch video"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {!playing && (
          <button
            onClick={() => videoRef.current?.play()}
            className="absolute inset-0 grid place-items-center bg-black/30"
            aria-label="Play video"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-signal text-void shadow-[0_0_40px_var(--signal)]">
              <Play className="ml-1 h-7 w-7 fill-current" />
            </span>
          </button>
        )}
        <button
          onClick={() => {
            const next = !muted
            setMuted(next)
            if (videoRef.current) {
              videoRef.current.muted = next
              if (!next) videoRef.current.play()
            }
          }}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-[0.75rem] font-medium text-white backdrop-blur"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </motion.div>
    </div>
  )
}

function FeatureRow({ eyebrow, title, body, mock, flip = false, toolId }) {
  const tool = tools.find((t) => t.id === toolId)
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <Reveal>
        <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-text-dim">{eyebrow}</p>
        {title}
        <p className="mt-4 max-w-[46ch] text-[1rem] leading-relaxed text-text-dim">{body}</p>
        {tool && (
          <Link to={tool.path} className="group mt-6 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-signal">
            Open {tool.name}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </Reveal>
      <Reveal delay={0.1} className="[perspective:1200px]">
        <motion.div
          initial={{ rotateY: flip ? 10 : -10, rotateX: 6 }}
          whileInView={{ rotateY: flip ? 4 : -4, rotateX: 2 }}
          whileHover={{ rotateY: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        >
          {mock}
        </motion.div>
      </Reveal>
    </div>
  )
}

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

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.04 } } }

  return (
    <div className="overflow-x-clip">
      {/* ---------- Hero ---------- */}
      <section className="relative">
        {/* floating format chips (video scene 1) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
          {CHIPS.map(([label, left, top, r, d, delay]) => (
            <span
              key={label}
              className="float-chip absolute rounded-lg bg-panel px-2.5 py-1.5 font-mono text-[0.7rem] font-semibold text-text-dim shadow-card"
              style={{ left, top, '--r': r, '--d': d, '--delay': delay }}
            >
              {label}
            </span>
          ))}
        </div>
        {/* speed lines (logo motif) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {[18, 34, 52, 71, 88].map((top, i) => (
            <span
              key={top}
              className="streak absolute left-0 h-px w-40 bg-gradient-to-r from-transparent via-signal to-transparent opacity-60"
              style={{ top: `${top}%`, '--d': `${5 + i}s`, '--delay': `${i * 1.3}s` }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-4xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-panel px-3.5 py-1.5 text-[0.75rem] font-medium text-text-dim shadow-card">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
            Free · private · no sign-up
          </span>
          <h1 className="text-[clamp(2.4rem,6.5vw,4.6rem)] font-bold leading-[1.02] tracking-tight">
            Every file you convert.
            <br />
            <span className="text-signal">Never leaves</span> your device.
          </h1>
          <p className="mx-auto mt-5 max-w-[56ch] text-[1.05rem] leading-relaxed text-text-dim">
            Images, PDFs, SVGs and data files — converted right in your browser, in seconds. No uploads, no
            watermarks, no account.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/#tools"
              className="inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_14px_34px_-12px_var(--signal)] transition-transform hover:-translate-y-0.5 dark:text-void"
            >
              Start converting <ArrowRight className="h-4 w-4" />
            </Link>
            <ExtensionButton variant="hero" />
          </div>

          {/* tool snippets → the rest */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {POPULAR.map((id) => {
              const t = tools.find((x) => x.id === id)
              const Icon = t.icon
              return (
                <Link
                  key={id}
                  to={t.path}
                  className="inline-flex items-center gap-2 rounded-full bg-panel px-3.5 py-2 text-[0.8rem] font-medium shadow-card transition-colors hover:text-signal"
                >
                  <Icon className="h-3.5 w-3.5 text-signal" /> {t.name}
                </Link>
              )
            })}
            <Link to="/#tools" className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.8rem] font-semibold text-signal">
              All {tools.length} tools <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

        <div className="relative px-4 pb-20 sm:px-6">
          <HeroVideo />
        </div>
      </section>

      {/* ---------- Every tool ---------- */}
      <section id="tools" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--panel-raised)_45%,transparent)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 text-center">
            <Title before="Every tool. " accent="One place." />
            <p className="mx-auto mt-3 max-w-[52ch] text-text-dim">
              {tools.length} converters and utilities — {localCount} of them never upload a single byte.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((cat, ci) => {
              const list = tools.filter((t) => t.category === cat.id)
              return (
                <Reveal key={cat.id} delay={ci * 0.08}>
                  <div className="mb-3 flex items-baseline justify-between px-1">
                    <h3 className="text-[1rem] font-semibold">{cat.label}</h3>
                    <span className="text-[0.75rem] text-text-dim">{list.length} tools</span>
                  </div>
                  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex flex-col gap-2.5">
                    {list.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </motion.div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- "What if it never left?" ---------- */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <Reveal>
          <Title before="What if it " accent="never left" after="?" className="text-[clamp(2.2rem,5.5vw,4rem)]" />
          <p className="mx-auto mt-5 max-w-[60ch] text-[1.05rem] leading-relaxed text-text-dim">
            Most online converters upload your photos, contracts and spreadsheets to someone else's server.
            FileFlowHQ does the work inside your browser instead — so your files stay exactly where they are.
          </p>
        </Reveal>
      </section>

      {/* ---------- Feature rows (video scenes) ---------- */}
      <section className="mx-auto max-w-6xl space-y-28 px-4 pb-28 sm:px-6 lg:px-8">
        <FeatureRow
          eyebrow="Image & PDF Compressor"
          title={<Title before="Compress to the " accent="size" after=" you need." />}
          body="Pick a target — 100 KB, 500 KB, 1 MB — and FileFlowHQ finds the best quality that fits. Perfect for upload limits and email attachments."
          mock={<CompressMock />}
          toolId="image-compressor"
        />
        <FeatureRow
          flip
          eyebrow="Merge / Split PDF"
          title={<Title accent="Merge" after=" and split PDFs." />}
          body="Drop in several PDFs, drag them into order, and get one file. Or pull out just the pages you need. Links inside the PDF keep working."
          mock={<MergeMock />}
          toolId="merge-split-pdf"
        />
        <FeatureRow
          eyebrow="Document Scanner"
          title={<Title before="Scan paper straight to " accent="PDF" after="." />}
          body="Point your phone's camera at a page, snap, and save a clean PDF — receipts, forms and notes, without installing an app."
          mock={<ScanMock />}
          toolId="document-scanner"
        />
      </section>

      {/* ---------- Checklist ---------- */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <div className="grid gap-3">
          {[
            ['Private by design', 'Files stay on your device.'],
            ['Free, no sign-up', 'No watermarks, no account, no limits on quality.'],
            ['Works offline', 'Install it like an app — on desktop and phone.']
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.1}>
              <div className="flex items-center gap-4 rounded-2xl bg-panel px-5 py-4 shadow-card">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-signal-dim text-signal">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-[0.85rem] text-text-dim">{d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- End card (video finale) ---------- */}
      <section className="relative overflow-hidden px-4 pb-24 sm:px-6">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[#040608] px-6 py-16 text-center sm:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {[20, 40, 60, 80].map((top, i) => (
              <span
                key={top}
                className="streak absolute left-0 h-px w-48 bg-gradient-to-r from-transparent via-[#3be698] to-transparent"
                style={{ top: `${top}%`, '--d': `${4 + i}s`, '--delay': `${i * 0.9}s` }}
              />
            ))}
          </div>
          <img src="/logofull.svg" alt="FileFlowHQ" width="248" height="63" className="relative mx-auto h-14 w-auto sm:h-20" />
          <p className="relative mt-6 text-[clamp(1.2rem,2.6vw,1.6rem)] font-semibold text-white">
            Free, <span className="text-[#3be698]">private</span> file conversion.
            <br />
            Right in your browser.
          </p>
          <Link
            to="/#tools"
            className="relative mt-8 inline-flex rounded-full bg-[#3be698] px-7 py-3 text-[0.95rem] font-semibold text-[#040608] transition-transform hover:-translate-y-0.5"
          >
            fileflowhq.com — start now
          </Link>
        </Reveal>
      </section>

      {/* Crawlable SEO copy — spells out the conversions in words with real
          links, giving search engines keyword-rich text and internal links. */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-[70ch] text-text-dim">
          <h2 className="mb-3 text-[1.1rem] font-semibold text-text">Free online file converter — private, no sign-up</h2>
          <p className="text-[0.9rem] leading-relaxed">
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
