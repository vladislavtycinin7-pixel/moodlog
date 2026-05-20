import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

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
    const { avatarUrl } = body

    // avatarUrl can be null/empty to remove, or a string to set
    const cleanedAvatarUrl =
      avatarUrl === null || avatarUrl === undefined || avatarUrl === ''
        ? null
        : typeof avatarUrl === 'string'
          ? avatarUrl.trim() || null
          : null

    // Update avatar
    const updatedUser = await db.user.update({
      where: { id: sessionUser.id },
      data: { avatarUrl: cleanedAvatarUrl },
      select: { id: true, username: true, avatarUrl: true, createdAt: true },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении аватара' },
      { status: 500 }
    )
  }
}
