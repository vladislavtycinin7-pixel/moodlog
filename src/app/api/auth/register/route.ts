import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, buildSessionCookieHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
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

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    // Check username uniqueness
    const existingUser = await db.user.findUnique({
      where: { username: username.trim() },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь с таким именем уже существует' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user in DB
    const user = await db.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
      },
      select: { id: true, username: true, avatarUrl: true },
    })

    // Create session
    const token = createSession(user.id)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
    })

    // Set cookie directly on response headers
    response.headers.set('Set-Cookie', buildSessionCookieHeader(token))

    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при регистрации' },
      { status: 500 }
    )
  }
}
