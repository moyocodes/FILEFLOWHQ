import { isExtension } from './platform'

// The web app calls its own serverless functions with relative URLs. The
// extension and native apps have no same-origin backend, so they call the
// hosted site explicitly.
const API_BASE = isExtension ? 'https://fileflowhq.com' : ''

/** Resolve an API path like '/api/pdf-to-word' against the right host. */
export function apiUrl(path) {
  return `${API_BASE}${path}`
}
