import { Loader2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Determinate/indeterminate progress indicator.
 * Pass a numeric `progress` (0-100) for a determinate bar, or omit it
 * for an indeterminate spinner + label (useful when a step's total
 * work can't be measured up front).
 */
export default function ProgressBar({ label = 'Working…', progress }) {
  const determinate = typeof progress === 'number'
  const prefersReducedMotion = useReducedMotion()
  const clamped = determinate ? Math.min(100, Math.max(0, progress)) : 0

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-panel px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-signal" strokeWidth={2.25} />
        <span>{label}</span>
        {determinate && (
          <span className="ml-auto font-mono text-xs text-text-dim">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        {determinate ? (
          <motion.div
            className="h-full rounded-full bg-signal"
            initial={false}
            animate={{ width: `${clamped}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 30 }}
          />
        ) : (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-signal" />
        )}
      </div>
    </div>
  )
}
