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
 */
export function applySeo({ title, description, path = '/' }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Free Online File Converter`
  const url = `${SITE_URL}${path}`

  document.title = fullTitle
  setMeta('name', 'description', description)
  setCanonical(url)

  setMeta('property', 'og:title', fullTitle)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)

  setMeta('name', 'twitter:title', fullTitle)
  setMeta('name', 'twitter:description', description)
}
