/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts.
 *
 * Vercel serverless: this may run on every cold start.
 * We keep it lightweight and non-blocking — a DB failure here
 * should NEVER prevent the app from starting.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[init] MoodLog server starting...')

    // Run health check asynchronously — don't block server startup
    const healthCheck = async () => {
      try {
        const { db } = await import('@/lib/db')

        // Quick connectivity test with timeout
        const result = await Promise.race([
          db.user.count(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DB health check timed out (5s)')), 5000)
          ),
        ])

        console.log(`[init] Database OK — ${result} user(s) found`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)

        if (msg.includes('prepared statement') || msg.includes('42P05')) {
          console.warn('[init] Database pooler connection issue (transient). App will retry on API calls.')
        } else if (msg.includes('timed out') || msg.includes('ECONNREFUSED')) {
          console.warn('[init] Database unreachable. Check DATABASE_URL in env vars.')
        } else {
          console.warn('[init] Database warning:', msg)
        }

        console.warn('[init] App will start anyway — API routes will retry connections automatically.')
      }
    }

    // Don't await — let the server start immediately
    healthCheck()
  }
}
