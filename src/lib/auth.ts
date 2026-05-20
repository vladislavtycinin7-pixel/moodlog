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
 * Read cookie from next/headers, verify session, fetch user from DB
 */
export async function getSessionUser(): Promise<{ id: string; username: string; avatarUrl: string | null } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      console.error('[auth] getSessionUser: no cookie found')
      return null
    }

    const session = verifySession(token)
    if (!session) {
      console.error('[auth] getSessionUser: token invalid or expired')
      return null
    }

    const { db } = await import('@/lib/db')
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, avatarUrl: true },
    })

    if (!user) {
      console.error('[auth] getSessionUser: user not found in DB, id=', session.userId)
    }

    return user
  } catch (err) {
    console.error('[auth] getSessionUser error:', err)
    return null
  }
}

/**
 * Set the session cookie on the response
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
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
 * Delete the session cookie
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
