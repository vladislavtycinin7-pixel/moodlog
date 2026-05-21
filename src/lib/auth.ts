import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'moodlog-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
const KEY_LENGTH = 64
const SALT_LENGTH = 16

// HMAC secret for token signing — uses env var or a stable derived key
function getHmacSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // Fallback: derive a stable secret from a fixed seed (dev only)
  // In production, SESSION_SECRET must be set
  console.warn('[auth] WARNING: SESSION_SECRET env var not set — using derived fallback. Set SESSION_SECRET in production!')
  return scryptSync('moodlog-session-secret-fallback', 'moodlog-salt', 32).toString('hex')
}

/**
 * Hash a password using Node.js crypto (scrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derivedKey}`
}

/**
 * Verify a password against its hash using Node.js crypto (scrypt)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedKey] = hash.split(':')
  if (!salt || !storedKey) return false
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return timingSafeEqual(Buffer.from(derivedKey), Buffer.from(storedKey))
}

/**
 * Create a session token: base64(payload).hmacSignature
 * The signature prevents token forgery — without the secret,
 * an attacker cannot produce a valid signature.
 * Includes tokenVersion so that logging out invalidates all existing tokens.
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
 * Checks HMAC signature first, then decodes and checks expiry.
 * Returns null if signature is invalid, token is malformed, or expired.
 */
export function verifySession(token: string): { userId: string; tv: number } | null {
  try {
    const dotIndex = token.indexOf('.')
    if (dotIndex === -1) return null

    const encoded = token.slice(0, dotIndex)
    const signature = token.slice(dotIndex + 1)

    // Verify HMAC signature
    const expectedSig = createHmac('sha256', getHmacSecret())
      .update(encoded)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    // Decode and validate payload
    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    const payload = JSON.parse(json) as { userId: string; tv?: number; exp: number }

    if (!payload.userId || !payload.exp) {
      return null
    }

    if (Date.now() > payload.exp) {
      return null
    }

    return { userId: payload.userId, tv: payload.tv ?? 0 }
  } catch {
    return null
  }
}

/**
 * Extract token from request (Authorization header or cookie) and verify session.
 * Returns the user object if valid, null otherwise.
 */
export async function getSessionUser(request?: Request): Promise<{ id: string; username: string; avatarUrl: string | null } | null> {
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
  } catch {
    return null
  }
}

/**
 * Build Set-Cookie header value for manual response attachment
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
 * Delete the session cookie via Set-Cookie header
 */
export function buildDeleteCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
}
