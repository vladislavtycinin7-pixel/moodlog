import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json({
        authenticated: false,
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
    })
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}
