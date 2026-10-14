/*
 * Fresh start on every deployment: when the build ID changes, wipe what this
 * site stored in the browser (localStorage, sessionStorage, and any cookies
 * on our domain) so prompts like "Add to Home Screen" and the email gate show
 * again. Only the visitor's theme choice and the owner's analytics settings
 * survive. Runs before React renders (see main.jsx).
 */
/* global __BUILD_ID__ */
const BUILD_KEY = 'ffhq-build'
const KEEP = ['theme', 'ffhq-analytics-optout', 'ffhq-analytics-optout-set', 'ffhq-stats-token']

export function resetOnNewDeploy() {
  const build = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : ''
  if (!build) return
  try {
    const previous = localStorage.getItem(BUILD_KEY)
    if (previous === build) return
    if (previous !== null) {
      const kept = KEEP.map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => v !== null)
      localStorage.clear()
      kept.forEach(([k, v]) => localStorage.setItem(k, v))
      sessionStorage.clear()
      for (const c of document.cookie.split(';')) {
        const name = c.split('=')[0].trim()
        if (name) document.cookie = `${name}=; Max-Age=0; path=/`
      }
    }
    localStorage.setItem(BUILD_KEY, build)
  } catch {
    // Storage blocked (private mode): nothing persisted, nothing to reset.
  }
}
