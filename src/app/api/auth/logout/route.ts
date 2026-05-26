import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, buildDeleteCookieHeader } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRetry } from '@/lib/db-retry'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    // Invalidate all existing tokens by bumping tokenVersion
    if (user) {
      await withRetry(() =>
        db.user.update({
          where: { id: user.id },
          data: { tokenVersion: { increment: 1 } },
        })
      )
    }

    const response = NextResponse.json({ success: true })
    // Clear session cookie
    response.headers.set('Set-Cookie', buildDeleteCookieHeader())
    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}
