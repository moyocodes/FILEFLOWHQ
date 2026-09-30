import { useEffect } from 'react'
import { Mail } from 'lucide-react'
import ContactForm, { CONTACT_EMAIL } from '../components/ContactForm.jsx'
import { applySeo } from '../utils/useSeo.js'

export default function Contact() {
  useEffect(() => {
    applySeo({
      title: 'Contact',
      description:
        'Contact FileFlowHQ: report a bug, request a feature, ask a privacy question, or get in touch about partnerships. We reply by email.',
      path: '/contact',
    })
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:px-9">
      <h1 className="font-display text-3xl tracking-wide">Contact FileFlowHQ</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-dim">
        Found a bug, want a feature, or have a question? Pick a template to get started, or just write your message.
        This isn&apos;t live chat — we reply by email.
      </p>

      <div className="mt-8 rounded-card border border-border bg-panel p-6">
        <ContactForm />
      </div>

      <div className="mt-8 flex items-center gap-3 text-sm text-text-dim">
        <Mail className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
        <span>
          Or email us directly at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-signal underline">
            {CONTACT_EMAIL}
          </a>
        </span>
      </div>

      <footer className="mt-10 border-t border-border pt-6">
        <p className="font-mono text-[0.65rem] text-text-dim">&copy; 2026 James Moyosore. All Rights Reserved.</p>
      </footer>
    </main>
  )
}
