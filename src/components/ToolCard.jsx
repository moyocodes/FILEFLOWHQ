import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

export default function ToolCard({ tool }) {
  const Icon = tool.icon
  const tag = tool.formats?.[0] || ''

  if (tool.comingSoon) {
    return (
      <motion.div variants={cardVariants}>
        <div
          aria-disabled="true"
          className="group relative flex h-full cursor-not-allowed flex-col overflow-hidden rounded-card border border-dashed border-border bg-panel p-5 opacity-60"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal-dim bg-gradient-to-br from-signal-dim to-transparent text-signal">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.62rem] text-text-dim">{tag}</span>
          </div>

          <h3 className="mb-1.5 text-[0.95rem] font-semibold tracking-tight">{tool.name}</h3>
          <p className="flex-1 text-[0.82rem] leading-relaxed text-text-dim">{tool.description}</p>

          <span className="mt-4 text-[0.8rem] font-medium text-text-dim">Coming soon</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={cardVariants}>
      <Link
        to={tool.path}
        className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-panel p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-signal hover:shadow-[0_18px_40px_-18px_var(--signal)]"
      >
        <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-signal opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20" />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal-dim bg-gradient-to-br from-signal-dim to-transparent text-signal">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.62rem] text-text-dim">{tag}</span>
        </div>

        <h3 className="mb-1.5 text-[0.95rem] font-semibold tracking-tight">{tool.name}</h3>
        <p className="flex-1 text-[0.82rem] leading-relaxed text-text-dim">{tool.description}</p>

        <span className="mt-4 inline-flex items-center gap-1 text-[0.8rem] font-medium text-signal transition-transform duration-200 group-hover:translate-x-0.5">Open tool →</span>
      </Link>
    </motion.div>
  )
}
