import { db } from '@/lib/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'moodlog-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

/**
 * Hash a password using Bun's built-in crypto
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

/**
 * Verify a password against its hash using Bun's built-in crypto
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

/**
 * Create a JWT-like session token (base64 encoded JSON with userId + expiry)
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
export async function getSessionUser(): Promise<{ id: string; username: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return null
    }

    const session = verifySession(token)
    if (!session) {
      return null
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true },
    })

    return user
  } catch {
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
