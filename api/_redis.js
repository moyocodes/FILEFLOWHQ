import { Redis } from '@upstash/redis'

// Vercel's Upstash integration injects KV_REST_API_*; a manually created
// Upstash database uses UPSTASH_REDIS_REST_*. Accept either.
export function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}
