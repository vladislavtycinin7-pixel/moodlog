import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Введите имя пользователя и пароль' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { username: typeof username === 'string' ? username.trim() : username },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Неверный пароль' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    })

    response.headers.set('Set-Cookie', createAuthCookie(user.id))

    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при входе' },
      { status: 500 }
    )
  }
}
