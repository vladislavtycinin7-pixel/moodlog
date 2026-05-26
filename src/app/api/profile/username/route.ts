import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { withRetry } from '@/lib/db-retry'

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request)
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { username } = body

    // Validate username: 2-20 chars
    if (
      !username ||
      typeof username !== 'string' ||
      username.trim().length < 2 ||
      username.trim().length > 20
    ) {
      return NextResponse.json(
        { success: false, message: 'Имя пользователя должно содержать от 2 до 20 символов' },
        { status: 400 }
      )
    }

    const trimmedUsername = username.trim()

    // Check if username is already taken by another user
    const existingUser = await withRetry(() =>
      db.user.findUnique({
        where: { username: trimmedUsername },
      })
    )

    if (existingUser && existingUser.id !== sessionUser.id) {
      return NextResponse.json(
        { success: false, message: 'Пользователь с таким именем уже существует' },
        { status: 409 }
      )
    }

    // Update username
    const updatedUser = await withRetry(() =>
      db.user.update({
        where: { id: sessionUser.id },
        data: { username: trimmedUsername },
        select: { id: true, username: true, avatarUrl: true, createdAt: true },
      })
    )

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении имени пользователя' },
      { status: 500 }
    )
  }
}
