import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import ContactForm, { CONTACT_EMAIL } from './ContactForm.jsx'

/**
 * Async "email live chat": a floating launcher that opens a side drawer with
 * the contact form (see ContactForm). Not real-time chat — messages are relayed
 * to the admin via Mailjet (api/contact-message.js).
 */
export default function ContactChat() {
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const close = () => setOpen(false)

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close contact panel' : 'Contact admin'}
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-signal text-void shadow-card sm:bottom-6 sm:left-6"
      >
        {open ? <X className="h-5 w-5" strokeWidth={2.25} /> : <MessageCircle className="h-5 w-5" strokeWidth={2.25} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-void/60 backdrop-blur-sm"
            />

            <motion.div
              key="drawer"
              initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[45] flex w-full max-w-md flex-col overflow-hidden border-l border-border bg-panel shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="gate-blob-a absolute -left-16 -top-16 h-48 w-48 rounded-full bg-signal/20 blur-3xl" />
              </div>

              <div className="relative flex items-center gap-2.5 border-b border-border px-6 py-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-signal text-void">
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold tracking-wide">Contact FileFlowHQ</p>
                  <p className="text-xs text-text-dim">Not live chat — we reply by email</p>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="relative flex-1 overflow-y-auto px-6 py-6">
                <ContactForm onDone={close} />

                <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-dim">
                  Prefer email? Write to{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-signal underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
