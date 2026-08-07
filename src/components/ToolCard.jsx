import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

export default function ToolCard({ tool }) {
  const Icon = tool.icon
  const tag = tool.formats?.[0] || ''

  return (
    <motion.div variants={cardVariants}>
      <Link
        to={tool.path}
        className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-panel p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-signal transition-transform duration-200 group-hover:scale-x-100" />

        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded bg-signal-dim text-signal">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="font-mono text-[0.62rem] text-text-dim">{tag}</span>
        </div>

        <h3 className="font-display mb-1 text-[0.8rem] font-semibold tracking-wide">{tool.name}</h3>
        <p className="flex-1 text-[0.74rem] leading-snug text-text-dim">{tool.description}</p>

        <span className="mt-2.5 font-mono text-[0.65rem] text-mono-text">→ open tool</span>
      </Link>
    </motion.div>
  )
}
