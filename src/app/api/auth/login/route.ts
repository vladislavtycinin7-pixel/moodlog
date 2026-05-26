import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, buildSessionCookieHeader } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 login attempts per minute per IP
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Введите имя пользователя и пароль' },
        { status: 400 }
      )
    }

    // Find user
    const user = await db.user.findUnique({
      where: { username: typeof username === 'string' ? username.trim() : username },
      select: { id: true, username: true, password: true, avatarUrl: true, tokenVersion: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Неверное имя пользователя или пароль' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Неверное имя пользователя или пароль' },
        { status: 401 }
      )
    }

    // Create session (include token version for invalidation support)
    const token = createSession(user.id, user.tokenVersion ?? 0)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
      token, // Client stores this in localStorage for Authorization header
    })

    // Also set cookie as fallback
    response.headers.set('Set-Cookie', buildSessionCookieHeader(token))

    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при входе' },
      { status: 500 }
    )
  }
}
