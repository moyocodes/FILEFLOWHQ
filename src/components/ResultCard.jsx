import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatBytes } from '../utils/fileHelpers.js'

function FileChip({ name, size, label }) {
  const ext = name.includes('.') ? name.split('.').pop().toUpperCase() : ''
  return (
    <div className="min-w-0 flex-1 rounded-card border border-border bg-panel p-3">
      <p className="mb-1.5 font-mono text-[0.62rem] uppercase tracking-wide text-text-dim">{label}</p>
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="mt-0.5 font-mono text-xs text-text-dim">
        {ext} {size != null ? `· ${formatBytes(size)}` : ''}
      </p>
    </div>
  )
}

/**
 * Before/after file-info comparison shown once a tool finishes converting.
 * Works for every tool regardless of file type since it compares name/size,
 * not visual content (most outputs — docx, pdf, csv — have no meaningful
 * visual preview).
 */
export default function ResultCard({ beforeName, beforeSize, afterName, afterSize }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-card border border-signal bg-signal-dim p-4"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 bg-signal"
      />
      <div className="relative mb-3 flex items-center gap-1.5 text-sm font-medium text-signal">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
        Done
      </div>
      <div className="relative flex items-center gap-2.5">
        <FileChip name={beforeName} size={beforeSize} label="Before" />
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-dim" strokeWidth={2} />
        <FileChip name={afterName} size={afterSize} label="After" />
      </div>
    </motion.div>
  )
}
