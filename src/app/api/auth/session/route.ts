import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({
        authenticated: false,
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, username: user.username },
    })
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}
