import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { withRetry } from '@/lib/db-retry'

/**
 * POST /api/stats/share
 * Generate or return existing share token for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Check if user already has a share token
    const dbUser = await withRetry(() =>
      db.user.findUnique({
        where: { id: user.id },
        select: { shareToken: true },
      })
    )

    if (dbUser?.shareToken) {
      return NextResponse.json({
        success: true,
        shareToken: dbUser.shareToken,
      })
    }

    let shareToken: string
    let attempts = 0
    do {
      shareToken = randomBytes(6).toString('base64url')
      attempts++
      const exists = await withRetry(() => db.user.findUnique({ where: { shareToken } }))
      if (!exists) break
    } while (attempts < 10)

    await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { shareToken },
      })
    )

    return NextResponse.json({
      success: true,
      shareToken,
    })
  } catch (error) {
    console.error('[stats/share] POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании ссылки' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stats/share
 * Revoke the share token for the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    await withRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { shareToken: null },
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stats/share] DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка' },
      { status: 500 }
    )
  }
}
