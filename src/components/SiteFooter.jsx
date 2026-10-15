import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from './ContactForm.jsx'

// Legal owner, shown in the footer line (same entity as LinqSafe's footer).
const PARENT_COMPANY = 'Motechs Digital Enterprise'
const PARENT_COMPANY_REG = 'BN 9898631'

/** One thin line on every page: mark, legal owner, contact and privacy. */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-[0.72rem] text-text-dim sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" width="24" height="24" className="h-6 w-6" />
          © {new Date().getFullYear()} FileFlowHQ · {PARENT_COMPANY} ({PARENT_COMPANY_REG})
        </p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-text">
            {CONTACT_EMAIL}
          </a>
          <Link to="/contact" className="hover:text-text">
            Contact
          </Link>
          <Link to="/privacy" className="hover:text-text">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
