import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth'

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
    const { currentPassword, newPassword, confirmPassword } = body

    // Validate current password
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Введите текущий пароль' },
        { status: 400 }
      )
    }

    // Validate new password: min 6 chars
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Новый пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    // Fetch user with password
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Неверный текущий пароль' },
        { status: 400 }
      )
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword)
    await db.user.update({
      where: { id: sessionUser.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён',
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при смене пароля' },
      { status: 500 }
    )
  }
}
