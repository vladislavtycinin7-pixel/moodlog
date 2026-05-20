import { NextResponse } from 'next/server'
import { deleteSessionCookie } from '@/lib/auth'

export async function POST() {
  try {
    await deleteSessionCookie()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при выходе' },
      { status: 500 }
    )
  }
}
