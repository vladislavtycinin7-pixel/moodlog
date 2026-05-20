import { NextResponse } from 'next/server'
import { buildDeleteCookieHeader } from '@/lib/auth'

export async function POST() {
  try {
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
