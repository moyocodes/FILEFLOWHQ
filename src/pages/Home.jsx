import { motion, useReducedMotion } from 'framer-motion'
import { tools } from '../toolsConfig.js'
import ToolCard from '../components/ToolCard.jsx'

const stats = [
  { n: '7', l: 'Conversion tools, one page' },
  { n: '0', l: 'Bytes ever sent to a server' },
  { n: '100%', l: 'Runs offline once loaded' }
]

export default function Home() {
  const prefersReducedMotion = useReducedMotion()

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
            Local processing only
          </span>

          <h1 className="font-display mb-3 max-w-[22ch] text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-[1.08] tracking-wide">
            Every file, <span className="text-signal">re-encoded</span> on your machine.
          </h1>

          <p className="mb-5 max-w-[52ch] font-body text-[0.92rem] normal-case text-text-dim">
            FileFlowHQ reads, decodes, and re-writes images, PDFs, and data files entirely in your
            browser. No upload, no server, no trace.
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
    </div>
  )
}
