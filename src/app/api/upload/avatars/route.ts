import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Magic byte signatures for image types
const MAGIC_BYTES: { bytes: number[]; ext: string; mime: string }[] = [
  { bytes: [0xFF, 0xD8, 0xFF], ext: 'jpg', mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], ext: 'png', mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif', mime: 'image/gif' },       // GIF8
  { bytes: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' },     // RIFF (WebP container)
]

/**
 * Verify the actual file content matches an allowed image type by checking magic bytes.
 * Returns the detected extension + mime, or null if not a valid image.
 */
function detectImageType(buffer: Buffer): { ext: string; mime: string } | null {
  for (const sig of MAGIC_BYTES) {
    let match = true
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false
        break
      }
    }
    if (match) return { ext: sig.ext, mime: sig.mime }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    // Rate limiting: 10 uploads per minute per IP
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Слишком много загрузок. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Файл не выбран' },
        { status: 400 }
      )
    }

    // Check MIME type from client (initial check)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Поддерживаются только JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Файл слишком большой (максимум 5MB)' },
        { status: 400 }
      )
    }

    // Read file content and verify magic bytes
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const detectedType = detectImageType(buffer)
    if (!detectedType) {
      return NextResponse.json(
        { success: false, message: 'Файл не является корректным изображением' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Use extension from detected type (not from user-provided filename)
    const ext = detectedType.ext
    const filename = `${user.id}-${randomUUID()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    // Write file to disk
    await writeFile(filepath, buffer)

    // The avatar URL that the client will use
    const avatarUrl = `/api/upload/avatars/${filename}`

    // Also update the user's avatar in the database
    const { db } = await import('@/lib/db')
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    })

    return NextResponse.json({
      success: true,
      avatarUrl,
      user: { id: user.id, username: user.username, avatarUrl },
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка при загрузке аватара' },
      { status: 500 }
    )
  }
}
