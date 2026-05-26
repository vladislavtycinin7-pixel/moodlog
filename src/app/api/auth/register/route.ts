import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, buildSessionCookieHeader } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { withRetry } from '@/lib/db-retry'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 registrations per minute per IP
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`register:${ip}`, RATE_LIMITS.auth)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    }

    const body = await request.json()
    const { username, password, confirmPassword } = body

    // Validate username: 2-20 chars
    if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 20) {
      return NextResponse.json(
        { success: false, message: 'Имя пользователя должно содержать от 2 до 20 символов' },
        { status: 400 }
      )
    }

    // Validate password: min 6 chars
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Validate password: max 128 chars (prevent DoS with huge passwords)
    if (password.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Пароль слишком длинный (максимум 128 символов)' },
        { status: 400 }
      )
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    // Check username uniqueness
    const existingUser = await withRetry(() =>
      db.user.findUnique({
        where: { username: username.trim() },
      })
    )

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь с таким именем уже существует' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user in DB
    const user = await withRetry(() =>
      db.user.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
        },
        select: { id: true, username: true, avatarUrl: true, tokenVersion: true },
      })
    )

    // Create session (new user has tokenVersion = 0)
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
      { success: false, message: 'Ошибка при регистрации' },
      { status: 500 }
    )
  }
}
