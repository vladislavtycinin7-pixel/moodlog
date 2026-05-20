import { db } from '@/lib/db'

const encoder = new TextEncoder()

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || crypto.randomUUID()
  const data = encoder.encode(s + password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return `${s}:${Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(':')
  const hash = await hashPassword(password, salt)
  return hash === stored
}

export async function getAuthUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/moodlog_user_id=([^;]+)/)
  if (!match) return null

  const userId = decodeURIComponent(match[1])
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, createdAt: true },
  })

  return user
}

export function createAuthCookie(userId: string): string {
  const maxAge = 30 * 24 * 60 * 60 // 30 days
  return `moodlog_user_id=${encodeURIComponent(userId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearAuthCookie(): string {
  return 'moodlog_user_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
}
