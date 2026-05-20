import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars')

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Basic security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Not found', { status: 404 })
    }

    const filepath = join(UPLOAD_DIR, filename)

    // Check file exists
    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_MAP[ext] || 'application/octet-stream'

    // Read and serve the file
    const buffer = await readFile(filepath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(buffer.length),
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
