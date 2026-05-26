/**
 * Database retry utility for serverless environments (Vercel).
 *
 * Transient errors that are safe to retry:
 * - "prepared statement" / 42P05 — PgBouncer prepared statement conflict
 * - "connection" timeout / refused — cold start connection lag
 * - "P1001" / "P1002" — Prisma connection errors
 * - "P2024" — Timed out fetching a connection from the pool
 * - "ECONNRESET" / "EPIPE" — Network blips
 * - "53300" — Too many connections
 */

const TRANSIENT_PATTERNS = [
  /prepared statement/i,
  /42P05/,
  /P1001/,
  /P1002/,
  /P2024/,
  /P2034/, // Transaction conflict
  /ECONNRESET/,
  /EPIPE/,
  /connection.*refused/i,
  /connection.*timed?\s*out/i,
  /53300/, // too many connections
  /cannot acquire a connection/i,
  /pool/i,
  /timeout/i,
]

export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message || ''
  return TRANSIENT_PATTERNS.some((p) => p.test(msg))
}

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 3000,
  shouldRetry: isTransientError,
}

/**
 * Execute a function with automatic retry on transient errors.
 * Uses exponential backoff with jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on the last attempt or non-transient errors
      if (attempt >= opts.maxRetries || !opts.shouldRetry(error)) {
        throw error
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * opts.baseDelayMs,
        opts.maxDelayMs
      )

      console.warn(
        `[db-retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(delay)}ms...`,
        error instanceof Error ? error.message : String(error)
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Safe Prisma query wrapper — catches errors, retries transient ones,
 * returns null instead of crashing on non-transient errors.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T | null = null
): Promise<T | null> {
  try {
    return await withRetry(fn, { maxRetries: 2 })
  } catch (error) {
    if (isTransientError(error)) {
      console.error('[db-retry] All retries exhausted for transient error:', error instanceof Error ? error.message : String(error))
    } else {
      console.error('[db-retry] Non-transient error:', error instanceof Error ? error.message : String(error))
    }
    return fallback
  }
}
