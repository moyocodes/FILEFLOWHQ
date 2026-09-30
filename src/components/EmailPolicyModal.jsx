import { X, ShieldCheck } from 'lucide-react'

/** Small "why we ask for this" explainer, opened from a link inside the email drawer. */
export default function EmailPolicyModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-panel p-6 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-signal" strokeWidth={2} />
            <h3 className="font-display text-base tracking-wide">Why we ask</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-raised hover:text-text"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="space-y-2.5 text-sm leading-relaxed text-text-dim">
          <p>Your email is used for exactly one thing: sending a one-time confirmation that your file was converted.</p>
          <p>We don't sell it, spam it, or use it for marketing. It isn't sent anywhere until you download a file, and it's only asked once — we remember it on this device so future downloads go straight through.</p>
          <p>Almost every tool converts files entirely on your device. The one exception is Word output in PDF to Word, which uploads the PDF to be converted.</p>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-void transition-opacity hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
