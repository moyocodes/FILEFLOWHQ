import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Mail, Info, X } from 'lucide-react'
import { useEmailGate } from '../context/EmailGateContext.jsx'
import EmailPolicyModal from './EmailPolicyModal.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailGateModal() {
  const { pending, submitEmail, skipGate, cancelGate } = useEmailGate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [showPolicy, setShowPolicy] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    submitEmail(value)
    setValue('')
    setError('')
  }

  const handleCancel = () => {
    cancelGate()
    setValue('')
    setError('')
  }

  return (
    <>
      <AnimatePresence>
        {pending && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancel}
              className="fixed inset-0 z-50 bg-void/60 backdrop-blur-md"
            />

            <motion.div
              key="drawer"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[55] flex w-full max-w-md flex-col overflow-hidden border-l border-border bg-panel shadow-2xl"
            >
              {/* Ambient animated background */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="gate-blob-a absolute -left-24 -top-24 h-72 w-72 rounded-full bg-signal/25 blur-3xl" />
                <div className="gate-blob-b absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-signal/15 blur-3xl" />
              </div>

              <div className="relative flex flex-1 flex-col overflow-y-auto px-7 py-8 sm:px-9">
                <button
                  onClick={handleCancel}
                  aria-label="Close"
                  className="absolute right-6 top-7 flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text sm:right-8"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>

                <div className="mt-auto mb-auto">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal text-void">
                    <Mail className="h-5 w-5" strokeWidth={2.25} />
                  </div>

                  <h2 className="font-display mb-2 text-2xl tracking-wide">One more step</h2>
                  <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-dim">
                    Enter your email and we'll send a confirmation once your file's ready. Asked once — every
                    download after this, on this device, goes straight through.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-border bg-void px-4 py-3 text-sm text-text outline-none transition-colors focus:border-signal"
                      />
                      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
                    >
                      Continue to download
                    </button>

                    <button
                      type="button"
                      onClick={skipGate}
                      className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-dim transition-colors hover:border-signal hover:text-signal"
                    >
                      Skip and download
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPolicy(true)}
                      className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-text-dim transition-colors hover:text-signal"
                    >
                      <Info className="h-3.5 w-3.5" strokeWidth={2} />
                      Why we ask for this
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showPolicy && <EmailPolicyModal onClose={() => setShowPolicy(false)} />}
    </>
  )
}
