import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'Имя пользователя должно содержать минимум 3 символа' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { username: username.trim() },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь с таким именем уже существует' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
      },
      select: { id: true, username: true },
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    })

    response.headers.set('Set-Cookie', createAuthCookie(user.id))

    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при регистрации' },
      { status: 500 }
    )
  }
}
