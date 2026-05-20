import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'moodlog-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
const KEY_LENGTH = 64
const SALT_LENGTH = 16

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
 * Create a session token (base64 encoded JSON with userId + expiry)
 */
export function createSession(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  }
  const json = JSON.stringify(payload)
  const token = Buffer.from(json).toString('base64')
  return token
}

/**
 * Decode and verify a session token, return null if expired/invalid
 */
export function verifySession(token: string): { userId: string } | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(json) as { userId: string; exp: number }

    if (!payload.userId || !payload.exp) {
      return null
    }

    if (Date.now() > payload.exp) {
      return null
    }

    return { userId: payload.userId }
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
      select: { id: true, username: true, avatarUrl: true },
    })

    return user
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
