import { useEffect } from "react";
import { Mail } from "lucide-react";
import ContactForm, { CONTACT_EMAIL } from "../components/ContactForm.jsx";
import { applySeo } from "../utils/useSeo.js";

export default function Contact() {
  useEffect(() => {
    applySeo({
      title: "Contact",
      description:
        "Contact FileFlowHQ: report a bug, request a feature, ask a privacy question, or get in touch about partnerships. We reply by email.",
      path: "/contact",
    });
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-b from-signal-dim to-transparent">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-12 sm:px-6">
          <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-signal">
            We reply by email
          </p>
          <h1 className="text-[clamp(1.8rem,3.4vw,2.5rem)] font-semibold leading-tight tracking-tight">
            Contact FileFlowHQ
          </h1>
          <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-text-dim">
            Found a bug, want a feature, or have a question? Pick a template to
            get started, or just write your message. This isn&apos;t live chat —
            we reply by email.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <div className="rounded-card bg-panel p-6 shadow-card sm:p-8">
          <ContactForm />
        </div>

        <div className="mt-8 flex items-center gap-3 text-sm text-text-dim">
          <Mail className="h-4 w-4 flex-shrink-0 text-signal" strokeWidth={2} />
          <span>
            Or email us directly at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-signal underline"
            >
              {CONTACT_EMAIL}
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
