import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })

    // Clear session cookie directly on response
    response.headers.set(
      'Set-Cookie',
      'moodlog-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax'
    )

    return response
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}
