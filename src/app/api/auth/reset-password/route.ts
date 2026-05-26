import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { randomInt } from 'crypto'

// 6-digit code expiry: 15 minutes
const CODE_EXPIRY_MS = 15 * 60 * 1000

/**
 * POST /api/auth/reset-password
 * Request a password reset code by username.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 reset requests per 5 minutes per IP
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`reset:${ip}`, { maxAttempts: 3, windowMs: 5 * 60 * 1000 })
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { username } = body

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, message: 'Введите имя пользователя' },
        { status: 400 }
      )
    }

    // Find user by username
    const user = await db.user.findUnique({
      where: { username: username.trim() },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Invalidate any existing unused reset codes for this user
    await db.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    })

    // Generate 6-digit code
    const code = String(randomInt(100000, 999999))

    // Save reset code to database
    const resetEntry = await db.passwordReset.create({
      data: {
        code,
        userId: user.id,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Код сброса сгенерирован',
      resetId: resetEntry.id,
      code,
    })
  } catch (error) {
    console.error('[reset-password] POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка при запросе сброса пароля' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/auth/reset-password
 * Verify reset code and set new password.
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting: 5 verification attempts per 5 minutes per IP
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`reset-verify:${ip}`, { maxAttempts: 5, windowMs: 5 * 60 * 1000 })
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { resetId, code, newPassword, confirmPassword } = body

    // Validate required fields
    if (!resetId || !code || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Заполните все поля' },
        { status: 400 }
      )
    }

    // Validate new password length
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Новый пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Пароль слишком длинный (максимум 128 символов)' },
        { status: 400 }
      )
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    // Find the reset entry
    const resetEntry = await db.passwordReset.findUnique({
      where: { id: resetId },
    })

    if (!resetEntry) {
      return NextResponse.json(
        { success: false, message: 'Неверный код сброса' },
        { status: 400 }
      )
    }

    // Check if already used
    if (resetEntry.used) {
      return NextResponse.json(
        { success: false, message: 'Код уже использован. Запросите новый.' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > resetEntry.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Код истёк. Запросите новый.' },
        { status: 400 }
      )
    }

    // Verify code
    if (resetEntry.code !== String(code)) {
      return NextResponse.json(
        { success: false, message: 'Неверный код сброса' },
        { status: 400 }
      )
    }

    // Mark code as used
    await db.passwordReset.update({
      where: { id: resetId },
      data: { used: true },
    })

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword)
    await db.user.update({
      where: { id: resetEntry.userId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 }, // Invalidate all existing sessions
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён! Теперь можете войти с новым паролем.',
    })
  } catch (error) {
    console.error('[reset-password] PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка при сбросе пароля' },
      { status: 500 }
    )
  }
}
