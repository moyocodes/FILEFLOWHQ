import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import ProcessIllustration from './ProcessIllustration.jsx'

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

/**
 * Compact, borderless tool card (icon, name, one-line tagline) with the
 * tool's process illustration faded into the right edge. Small enough that
 * the whole catalogue fits on the home screen without scrolling.
 */
export default function ToolCard({ tool }) {
  const Icon = tool.icon

  const body = (
    <>
      <ProcessIllustration
        tool={tool}
        className="pointer-events-none absolute -right-4 top-1/2 h-[120%] -translate-y-1/2 opacity-[0.22] transition-opacity duration-300 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:opacity-60"
      />
      <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-signal-dim text-signal">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[0.9rem] font-normal text-text">{tool.name}</span>
        <span className="block truncate text-[0.76rem] text-text-dim">
          {tool.comingSoon ? 'Coming soon' : tool.tagline || tool.description}
        </span>
      </span>
    </>
  )

  if (tool.comingSoon) {
    return (
      <motion.div variants={cardVariants}>
        <div aria-disabled="true" className="relative flex cursor-not-allowed items-center gap-3 overflow-hidden rounded-2xl bg-panel px-3.5 py-3 opacity-60 shadow-card">
          {body}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={cardVariants}>
      <Link
        to={tool.path}
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-panel px-3.5 py-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
      >
        {body}
        <ArrowRight
          className="relative h-4 w-4 flex-shrink-0 text-signal opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          strokeWidth={2.25}
        />
      </Link>
    </motion.div>
  )
}
