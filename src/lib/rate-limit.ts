/**
 * Simple in-memory rate limiter.
 * Tracks request counts per key (usually IP address) within a time window.
 * For production, consider using Redis instead.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

/** Default configs for different endpoint types */
export const RATE_LIMITS = {
  /** Auth endpoints: 20 requests per minute per IP — generous for proxy/shared IPs */
  auth: { limit: 20, windowMs: 60_000 },
  /** File upload: 10 requests per minute per IP */
  upload: { limit: 10, windowMs: 60_000 },
  /** General API: 60 requests per minute per IP */
  general: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>

/**
 * Check if a request should be rate-limited.
 * Returns { allowed: true } if the request is allowed,
 * or { allowed: false, retryAfterMs } if it should be rejected.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  if (entry.count >= config.limit) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Extract client IP from a Next.js request.
 * Checks X-Forwarded-For and X-Real-IP headers, falls back to 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // X-Forwarded-For may contain multiple IPs — use the first one
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
