import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Volume2, VolumeX, Play } from 'lucide-react'
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
// [label, left, top, tilt, duration, delay] — kept to the edges and the top/bottom
// bands so they never sit on the headline or buttons.
const CHIPS = [
  ['SVG', '30%', '5%', '12deg', '6s', '1.2s'],
  ['JSON', '55%', '3%', '6deg', '8s', '1s'],
  ['PDF', '72%', '8%', '-4deg', '7s', '0.4s'],
  ['CSV', '88%', '14%', '10deg', '6.5s', '0.5s'],
  ['DOCX', '95%', '52%', '-6deg', '7.5s', '1.5s'],
  ['TIFF', '80%', '91%', '-10deg', '8.5s', '0.2s'],
  ['PNG', '50%', '93%', '-8deg', '7s', '0s'],
  ['JPG', '1.5%', '93%', '4deg', '9s', '0.8s']
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

/** Launch video in a tilted app window (like the video's own 3D shots) that settles on hover. */
function HeroVideo() {
  const videoRef = useRef(null)
  const reduce = useReducedMotion()
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(!reduce)

  return (
    <div className="relative mx-auto w-full max-w-3xl [perspective:1400px]">
      <motion.div
        initial={reduce ? false : { opacity: 0, rotateY: -18, rotateX: 8, y: 30 }}
        animate={{ opacity: 1, rotateY: reduce ? 0 : -4, rotateX: reduce ? 0 : 2, y: 0 }}
        whileHover={{ rotateY: 0, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.15, opacity: { duration: 0.4, delay: 0.1 } }}
        // Dark mode: no frame — the video's own near-black background is the page's,
        // and a soft edge mask dissolves it into the page. Light mode keeps a
        // rounded frame (a dark video can't blend into a light page).
        className="relative overflow-hidden rounded-[22px] bg-black shadow-lift dark:rounded-none dark:bg-transparent dark:shadow-none dark:[mask-image:radial-gradient(ellipse_75%_70%_at_50%_50%,#000_55%,transparent_100%)]"
      >
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
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[0.72rem] font-medium text-white backdrop-blur"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </motion.div>
    </div>
  )
}

/** Compact feature card: a short headline over an animated mock of the tool. */
function FeatureCard({ title, mock, toolId, delay = 0 }) {
  const tool = tools.find((t) => t.id === toolId)
  return (
    <Reveal delay={delay} className="flex flex-col">
      <h3 className="mb-4 text-[1.25rem] font-bold leading-snug tracking-tight">{title}</h3>
      <div className="[perspective:1200px]">
        <motion.div
          initial={{ rotateX: 8 }}
          whileInView={{ rotateX: 0 }}
          whileHover={{ y: -4 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        >
          {mock}
        </motion.div>
      </div>
      {tool && (
        <Link to={tool.path} className="group mt-4 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-signal">
          Open {tool.name}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </Reveal>
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
          className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:px-8"
        >
          <div className="text-center lg:text-left">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-panel px-3.5 py-1.5 text-[0.75rem] font-medium text-text-dim shadow-card">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
            Free · private · no sign-up
          </span>
          <h1 className="text-[clamp(2.1rem,4.6vw,3.6rem)] font-bold leading-[1.04] tracking-tight">
            Every file you convert.
            <br />
            <span className="text-signal">Never leaves</span> your device.
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[1.05rem] leading-relaxed text-text-dim lg:mx-0">
            Images, PDFs, SVGs and data files — converted right in your browser, in seconds. No uploads, no
            watermarks, no account.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              to="/#tools"
              className="inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_14px_34px_-12px_var(--signal)] transition-transform hover:-translate-y-0.5 dark:text-void"
            >
              Start converting <ArrowRight className="h-4 w-4" />
            </Link>
            <ExtensionButton variant="hero" />
          </div>

          {/* tool snippets → the rest */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
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
          </div>

          <HeroVideo />
        </motion.div>

      </section>

      {/* ---------- Every tool ---------- */}
      <section id="tools" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--panel-raised)_45%,transparent)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 text-center">
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

      {/* ---------- Three features, one row ---------- */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <FeatureCard title={<>Compress to the <span className="text-signal">size</span> you need.</>} mock={<CompressMock />} toolId="image-compressor" />
        <FeatureCard title={<><span className="text-signal">Merge</span> and split PDFs.</>} mock={<MergeMock />} toolId="merge-split-pdf" delay={0.08} />
        <FeatureCard title={<>Scan paper straight to <span className="text-signal">PDF</span>.</>} mock={<ScanMock />} toolId="document-scanner" delay={0.16} />
      </section>

      {/* Crawlable SEO copy — spells out the conversions in words with real
          links, giving search engines keyword-rich text and internal links. */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
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
