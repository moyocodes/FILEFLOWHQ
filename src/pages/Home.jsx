import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { tools, categories } from '../toolsConfig.js'
import ToolCard from '../components/ToolCard.jsx'
import { studioApps } from '../studioApps.js'
import { applySeo } from '../utils/useSeo.js'

/*
 * Home page, kept to two screens: hero (the launch video as its background) → every tool.
 * Details (how-to, FAQ, keyword copy) live on each tool's own page, not here.
 */

const localCount = tools.filter((t) => !t.usesServer).length

/** Section heading in the video's style: white, with one mint keyword. */
function Title({ before, accent, after, className = '' }) {
  return (
    <h2 className={`text-[clamp(1.6rem,3.2vw,2.4rem)] font-medium leading-[1.15] tracking-tight ${className}`}>
      {before}
      <span className="font-semibold text-signal">{accent}</span>
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

/**
 * The launch video as the hero, full width and uncropped (it carries its own captions, so no
 * text goes over it). Muted autoplay (browsers allow nothing else); reduced motion shows the
 * poster still.
 */
function HeroVideo() {
  const videoRef = useRef(null)
  const reduce = useReducedMotion()
  const [muted, setMuted] = useState(true)

  return (
    <>
      <video
        ref={videoRef}
        className="video-in absolute inset-0 h-full w-full object-cover"
        src="/launch-720.mp4"
        poster="/launch-poster.jpg"
        autoPlay={!reduce}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label="FileFlowHQ launch video"
      />
      {/* Shade under the nav and the buttons only, in the page's own colour: a light mist in
          light mode, near-black in dark mode. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[color-mix(in_srgb,var(--void)_92%,transparent)] via-[color-mix(in_srgb,var(--void)_55%,transparent)] to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[color-mix(in_srgb,var(--void)_80%,transparent)] to-transparent" />
      <button
        onClick={() => {
          const next = !muted
          setMuted(next)
          if (videoRef.current) {
            videoRef.current.muted = next
            if (!next) videoRef.current.play()
          }
        }}
        className="absolute bottom-5 right-6 z-10 hidden items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--panel)_70%,transparent)] px-3 py-1.5 text-[0.72rem] font-normal text-text shadow-card backdrop-blur sm:inline-flex"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? 'Sound off' : 'Sound on'}
      </button>
    </>
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
      {/* The video's own frame (16:9) sets the height, up to the window, starting behind the
          transparent nav (-mt-16). The two actions sit over its bottom edge, or below it on
          phones, where the frame is too short to hold them. */}
      <section className="relative isolate -mt-16 bg-void">
        <div className="relative aspect-video max-h-[100svh] w-full overflow-hidden">
          <HeroVideo />
        </div>
        <h1 className="sr-only">Convert anything. Upload nothing. Free file converter and {studioApps.length} editors that run on your device.</h1>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:justify-start sm:py-0 sm:pb-5 sm:px-6 lg:px-8"
        >
          <Link
            to="/#tools"
            className="inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 text-[0.95rem] font-medium text-white shadow-[0_14px_34px_-12px_var(--signal)] transition-transform hover:-translate-y-0.5 dark:text-void"
          >
            Pick a tool <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--panel)_75%,transparent)] px-5 py-3 text-[0.95rem] font-normal text-text shadow-card backdrop-blur transition-colors hover:bg-panel"
          >
            <Sparkles className="h-4 w-4 text-signal" /> Open Studio
          </Link>
        </motion.div>
      </section>

      {/* ---------- Every tool ---------- */}
      <section id="tools" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--panel-raised)_45%,transparent)] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-6 text-center">
            <Title before="Every tool. " accent="One place." />
            <p className="mx-auto mt-2 max-w-[52ch] text-[0.9rem] text-text-dim">
              {tools.length} tools, {localCount} of them never upload a single byte.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((cat, ci) => {
              const list = tools.filter((t) => t.category === cat.id)
              return (
                <Reveal key={cat.id} delay={ci * 0.08}>
                  <div className="mb-3 flex items-baseline justify-between px-1">
                    <h3 className="text-[1rem] font-medium">{cat.label}</h3>
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

    </div>
  )
}
