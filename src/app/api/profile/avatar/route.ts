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

    // avatarUrl can be null/empty to remove, or a valid URL string
    let cleanedAvatarUrl: string | null = null

    if (avatarUrl !== null && avatarUrl !== undefined && avatarUrl !== '') {
      if (typeof avatarUrl !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Некорректный URL аватара' },
          { status: 400 }
        )
      }
      const trimmed = avatarUrl.trim()
      if (!trimmed) {
        cleanedAvatarUrl = null
      } else if (trimmed.startsWith('data:image/')) {
        // Allow base64 data URLs (from upload)
        cleanedAvatarUrl = trimmed
      } else if (trimmed.startsWith('/api/upload/avatars/')) {
        // Allow local uploaded avatar paths
        cleanedAvatarUrl = trimmed
      } else if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        // Allow external URLs (must start with http(s)://)
        // Basic validation: must look like a URL
        try {
          new URL(trimmed)
          cleanedAvatarUrl = trimmed
        } catch {
          return NextResponse.json(
            { success: false, message: 'Некорректный URL аватара' },
            { status: 400 }
          )
        }
      } else {
        // Reject javascript:, data:, and any other schemes
        return NextResponse.json(
          { success: false, message: 'URL аватара должен начинаться с data:image/, /api/upload/avatars/ или https://' },
          { status: 400 }
        )
      }
    }

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
