import { pbkdf2Sync, randomBytes, timingSafeEqual, createHmac } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'moodlog-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
const KEY_LENGTH = 32
const SALT_LENGTH = 16
const ITERATIONS = 100_000 // OWASP recommended minimum for PBKDF2-SHA256

// Stable fallback secret — only used when SESSION_SECRET env var is not set
// This ensures tokens stay valid across server restarts in development
const FALLBACK_SECRET = 'moodlog-dev-stable-fallback-secret-key-do-not-use-in-prod'

function getHmacSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // In development, use a stable fallback so tokens survive server restarts
  if (process.env.NODE_ENV !== 'production') {
    return FALLBACK_SECRET
  }
  console.warn('[auth] WARNING: SESSION_SECRET env var not set in production! Tokens may be invalid after restart.')
  return FALLBACK_SECRET
}

/**
 * Hash a password using PBKDF2-SHA256
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256').toString('hex')
  return `pbkdf2:${salt}:${derivedKey}`
}

/**
 * Verify a password against its hash.
 * Supports both old format (salt:derivedKey) and new format (pbkdf2:salt:derivedKey).
 * Old format hashes are tried with both scrypt (legacy) and pbkdf2.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // New format: pbkdf2:salt:derivedKey
    if (hash.startsWith('pbkdf2:')) {
      const parts = hash.split(':')
      if (parts.length !== 3) return false
      const [, salt, storedKey] = parts
      if (!salt || !storedKey) return false
      const derivedKey = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256').toString('hex')
      // Compare as hex strings first (length check), then use timingSafeEqual on buffers
      if (derivedKey.length !== storedKey.length) return false
      return timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(storedKey, 'hex'))
    }

    // Old format: salt:derivedKey (could be scrypt or pbkdf2 without prefix)
    const colonIndex = hash.indexOf(':')
    if (colonIndex === -1) return false
    const salt = hash.slice(0, colonIndex)
    const storedKey = hash.slice(colonIndex + 1)
    if (!salt || !storedKey) return false

    const keyLength = storedKey.length / 2 // hex chars / 2 = bytes

    // Try pbkdf2-sha256 first (most likely for old-format hashes created during migration)
    try {
      const derivedKey = pbkdf2Sync(password, salt, ITERATIONS, keyLength, 'sha256').toString('hex')
      if (derivedKey.length === storedKey.length && timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(storedKey, 'hex'))) {
        return true
      }
    } catch {
      // pbkdf2-sha256 failed
    }

    // Try scrypt as fallback for very old hashes
    try {
      const { scryptSync } = await import('crypto')
      const derivedKey = scryptSync(password, salt, keyLength).toString('hex')
      if (derivedKey.length === storedKey.length && timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(storedKey, 'hex'))) {
        return true
      }
    } catch {
      // scrypt failed (may OOM on low-memory systems)
    }

    return false
  } catch (error) {
    console.error('[auth] Password verification error:', error)
    return false
  }
}

/**
 * Check if a hash needs migration to the new pbkdf2 format
 */
export function needsHashMigration(hash: string): boolean {
  return !hash.startsWith('pbkdf2:')
}

/**
 * Migrate a user's password hash to pbkdf2 format.
 * Called after successful login with old-format hash.
 */
export async function migratePasswordHash(userId: string, password: string): Promise<void> {
  try {
    const newHash = await hashPassword(password)
    const { db } = await import('@/lib/db')
    await db.user.update({
      where: { id: userId },
      data: { password: newHash },
    })
  } catch (error) {
    console.error('[auth] Failed to migrate password hash:', error)
  }
}

/**
 * Create a session token: base64(payload).hmacSignature
 */
export function createSession(userId: string, tokenVersion: number = 0): string {
  const payload = {
    userId,
    tv: tokenVersion,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64')
  const signature = createHmac('sha256', getHmacSecret())
    .update(encoded)
    .digest('hex')
  return `${encoded}.${signature}`
}

/**
 * Verify a signed session token.
 */
export function verifySession(token: string): { userId: string; tv: number } | null {
  try {
    const dotIndex = token.indexOf('.')
    if (dotIndex === -1) return null

    const encoded = token.slice(0, dotIndex)
    const signature = token.slice(dotIndex + 1)

    const expectedSig = createHmac('sha256', getHmacSecret())
      .update(encoded)
      .digest('hex')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    const payload = JSON.parse(json) as { userId: string; tv?: number; exp: number }

    if (!payload.userId || !payload.exp) return null
    if (Date.now() > payload.exp) return null

    return { userId: payload.userId, tv: payload.tv ?? 0 }
  } catch {
    return null
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract token from request and verify session.
 * Uses retry with exponential backoff for transient DB errors.
 * This is the KEY fix for the 401 bug — previously, a single DB error
 * (like PgBouncer prepared statement conflict) would cause getSessionUser()
 * to return null, making ALL API calls return 401.
 */
export async function getSessionUser(request?: Request): Promise<{ id: string; username: string; avatarUrl: string | null } | null> {
  const MAX_RETRIES = 3
  const BASE_DELAY = 200

  try {
    let token: string | null = null

    // 1) Try Authorization: Bearer <token> header first (most reliable)
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }

    // 2) Fall back to cookie
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null
    }

    if (!token) {
      return null
    }

    const session = verifySession(token)
    if (!session) {
      return null
    }

    // Retry the DB query on transient errors (42P05, connection timeout, etc.)
    let lastError: unknown = null
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { db } = await import('@/lib/db')
        const user = await db.user.findUnique({
          where: { id: session.userId },
          select: { id: true, username: true, avatarUrl: true, tokenVersion: true },
        })

        if (!user) return null

        // Check token version — if user logged out (bumped version), old tokens are invalid
        if (session.tv !== user.tokenVersion) {
          return null
        }

        return { id: user.id, username: user.username, avatarUrl: user.avatarUrl }
      } catch (dbError) {
        lastError = dbError
        const errorMsg = dbError instanceof Error ? dbError.message : String(dbError)

        // Only retry on transient errors
        const isTransient = /prepared statement|42P05|P1001|P1002|P2024|ECONNRESET|EPIPE|connection.*refused|connection.*timed?\s*out|53300|cannot acquire|pool|timeout/i.test(errorMsg)

        if (!isTransient || attempt >= MAX_RETRIES - 1) {
          console.error(`[auth] getSessionUser DB query failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, errorMsg)
          throw dbError
        }

        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt) + Math.random() * 200, 3000)
        console.warn(`[auth] getSessionUser transient error, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms...`)
        await sleep(delay)
      }
    }

    throw lastError
  } catch {
    return null
  }
}

/**
 * Build Set-Cookie header value
 */
export function buildSessionCookieHeader(token: string): string {
  const maxAge = SESSION_MAX_AGE
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
  let cookie = `${SESSION_COOKIE_NAME}=${token}; Path=/; Expires=${expires}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
  if (process.env.NODE_ENV === 'production') {
    cookie += '; Secure'
  }
  return cookie
}

/**
 * Delete the session cookie
 */
export function buildDeleteCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 1 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
}
