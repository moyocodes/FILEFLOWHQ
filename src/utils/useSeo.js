const SITE_URL = 'https://fileflowhq.com'
const SITE_NAME = 'FileFlowHQ'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Updates document title, meta description, canonical link, and OG/Twitter
 * tags for the current route. Googlebot renders JS before indexing, so this
 * gives each tool page distinct, crawlable metadata despite being an SPA.
 *
 * Pass `fullTitle` to use an exact page title verbatim (already keyword-rich);
 * otherwise `title` is suffixed with the site name.
 */
export function applySeo({ title, fullTitle: exactTitle, description, keywords, path = '/' }) {
  const pageTitle =
    exactTitle || (title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Free Online File Converter`)
  const url = `${SITE_URL}${path}`

  document.title = pageTitle
  setMeta('name', 'description', description)
  if (keywords) setMeta('name', 'keywords', keywords)
  setCanonical(url)

  setMeta('property', 'og:title', pageTitle)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)

  setMeta('name', 'twitter:title', pageTitle)
  setMeta('name', 'twitter:description', description)
}

const FAQ_SCRIPT_ID = 'faq-jsonld'

/**
 * Inject (or replace) a FAQPage JSON-LD block for the current page so Google
 * can show FAQ rich results. Pass an array of { q, a }. Call with an empty
 * array (or on unmount) to remove it — pages without an FAQ must not leak the
 * previous page's questions.
 */
export function setFaqJsonLd(faq) {
  const existing = document.getElementById(FAQ_SCRIPT_ID)
  if (!faq || faq.length === 0) {
    if (existing) existing.remove()
    return
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const el = existing || document.createElement('script')
  el.type = 'application/ld+json'
  el.id = FAQ_SCRIPT_ID
  el.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(el)
}
