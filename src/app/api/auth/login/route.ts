import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, buildSessionCookieHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
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
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Неверный пароль' },
        { status: 401 }
      )
    }

    // Create session
    const token = createSession(user.id)

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
