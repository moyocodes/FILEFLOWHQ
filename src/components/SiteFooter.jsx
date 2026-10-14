import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUp } from 'lucide-react'
import { tools, categories } from '../toolsConfig.js'
import { CONTACT_EMAIL } from './ContactForm.jsx'

// Legal owner, shown in the footer line (same entity as LinqSafe's footer).
const PARENT_COMPANY = 'Motechs Digital Enterprise'
const PARENT_COMPANY_REG = 'BN 9898631'

const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
}

/**
 * Dark footer band on every page, modelled on LinqSafe's: brand + CTA,
 * link columns (every tool, so crawlers get internal links from every page),
 * the legal line, back-to-top, and an oversized wordmark watermark.
 */
export default function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-[#040608] text-[#dfe7e3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_90%_0%,rgba(59,230,152,0.16),transparent_70%),radial-gradient(30rem_18rem_at_0%_100%,rgba(59,230,152,0.07),transparent_70%)]"
      />
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8"
      >
        <motion.div variants={reveal}>
          <img src="/logofull.svg" alt="FileFlowHQ" width="248" height="63" className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-[#93a29d]">
            Free, private file conversion that runs in your browser. No sign-up, no watermarks.
          </p>
          <motion.div whileHover={{ x: 3 }} className="mt-6 inline-block">
            <Link
              to="/#tools"
              className="group inline-flex items-center gap-2 rounded-full bg-[#3be698] px-5 py-2.5 text-sm font-semibold text-[#040608]"
            >
              Start converting
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {categories.map((cat) => (
          <motion.nav key={cat.id} variants={reveal} aria-label={cat.label}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7d8c87]">{cat.label}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {tools
                .filter((t) => t.category === cat.id)
                .map((t) => (
                  <li key={t.id}>
                    <Link
                      to={t.path}
                      className="relative inline-block after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:text-white hover:after:scale-x-100"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </motion.nav>
        ))}
      </motion.div>

      <div className="relative bg-white/[0.03]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-[#8b9894] sm:px-6 lg:px-8">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} FileFlowHQ. All rights reserved.</p>
            <p>
              FileFlowHQ is a product of {PARENT_COMPANY} ({PARENT_COMPANY_REG}).
            </p>
            <p>
              Contact{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-white">
                {CONTACT_EMAIL}
              </a>
              <span className="mx-2">·</span>
              <Link to="/contact" className="hover:text-white">
                Contact form
              </Link>
              <span className="mx-2">·</span>
              <Link to="/privacy" className="hover:text-white">
                Privacy
              </Link>
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-1.5 hover:bg-white/10"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> Back to top
          </motion.button>
        </div>
      </div>

      {/* Oversized wordmark that rises into view and fades into the footer. */}
      <motion.img
        aria-hidden="true"
        src="/logofull.svg"
        alt=""
        width={248}
        height={63}
        initial={{ y: '30%', opacity: 0 }}
        whileInView={{ y: '14%', opacity: 0.08 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none mx-auto block w-[88%] max-w-5xl select-none [mask-image:linear-gradient(to_bottom,#000_35%,transparent_85%)]"
      />
    </footer>
  )
}
