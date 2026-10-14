import { Link } from 'react-router-dom'
import { tools, categories } from '../toolsConfig.js'

/**
 * Dark footer band on every page. Also gives crawlers a full set of internal
 * links to every tool from every page.
 */
export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-[#0b0d10] text-[#c9d1d6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)] lg:px-8">
        <div>
          <img src="/logofull.svg" alt="FileFlowHQ" width="248" height="63" className="mb-4 h-9 w-auto" />
          <p className="max-w-[32ch] text-[0.85rem] leading-relaxed text-[#8b959e]">
            Free, private file conversion that runs in your browser. No sign-up, no watermarks.
          </p>
          <div className="mt-5 flex gap-4 text-[0.85rem]">
            <Link to="/contact" className="transition-colors hover:text-white">
              Contact
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white">{cat.label}</div>
            <ul className="space-y-2 text-[0.85rem]">
              {tools
                .filter((t) => t.category === cat.id)
                .map((t) => (
                  <li key={t.id}>
                    <Link to={t.path} className="text-[#8b959e] transition-colors hover:text-white">
                      {t.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-8 text-[0.75rem] text-[#6b757e] sm:px-6 lg:px-8">
        &copy; 2026 James Moyosore. All Rights Reserved.
      </div>
    </footer>
  )
}
