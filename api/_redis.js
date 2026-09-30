import { Redis } from '@upstash/redis'

// Vercel's Upstash integration injects KV_REST_API_URL / KV_REST_API_TOKEN by
// default, a manually created Upstash database uses UPSTASH_REDIS_REST_*, and
// the integration lets you pick a custom prefix (e.g. STORAGE_KV_REST_API_*).
// Find the pair by suffix so any of those work.
function findEnv(suffixes) {
  for (const key of Object.keys(process.env)) {
    if (suffixes.some((s) => key.endsWith(s)) && process.env[key]) return process.env[key]
  }
  return undefined
}

export function getRedis() {
  const url = findEnv(['REST_API_URL', 'REDIS_REST_URL'])
  const token = findEnv(['REST_API_TOKEN', 'REDIS_REST_TOKEN'])
  if (!url || !token) return null
  return new Redis({ url, token })
}
