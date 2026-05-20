import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
