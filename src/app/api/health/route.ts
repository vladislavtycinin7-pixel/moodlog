import { NextResponse } from 'next/server'

export const maxDuration = 10 // seconds — Vercel serverless function timeout

/**
 * Health check endpoint for Vercel monitoring.
 * Tests database connectivity and returns status.
 * Vercel uses this to determine if the deployment is healthy.
 */
export async function GET() {
  const startTime = Date.now()
  let dbStatus: 'ok' | 'error' | 'timeout' = 'ok'
  let dbLatency = 0

  try {
    const dbStart = Date.now()
    const { db } = await import('@/lib/db')

    // Quick DB ping with timeout
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ])

    dbLatency = Date.now() - dbStart
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('timeout')) {
      dbStatus = 'timeout'
    } else {
      dbStatus = 'error'
    }
  }

  const totalLatency = Date.now() - startTime
  const isHealthy = dbStatus === 'ok'

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : null,
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      totalLatencyMs: totalLatency,
    },
    { status: isHealthy ? 200 : 503 }
  )
}
