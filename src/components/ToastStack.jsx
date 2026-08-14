import { CheckCircle2, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useToast } from '../context/ToastContext.jsx'

export default function ToastStack() {
  const { toasts, dismissToast } = useToast()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-card border border-border bg-panel px-4 py-3 shadow-card"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
            <p className="flex-1 truncate text-sm text-text">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="flex-shrink-0 text-text-dim transition-colors hover:text-text"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
