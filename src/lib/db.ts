import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Build the datasource URL for Prisma.
 *
 * In production (Vercel serverless), we append connection_limit=1 & pool_timeout=20
 * to avoid exhausting the Supabase connection pool. Each serverless function instance
 * should only hold 1 connection at a time.
 *
 * We also append pgbouncer=true if the URL points to a Supabase pooler hostname,
 * so Prisma avoids prepared statements that PgBouncer can't handle.
 */
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined

  // Only modify URL in production (serverless)
  if (process.env.NODE_ENV !== 'production') return url

  try {
    const parsed = new URL(url)

    // Detect Supabase pooler hostname
    const isPooler = parsed.hostname.includes('pooler.supabase.com')

    // Don't add params that are already there
    const params = new URLSearchParams(parsed.search)

    if (!params.has('connection_limit')) {
      params.set('connection_limit', '1')
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', '20')
    }
    if (isPooler && !params.has('pgbouncer')) {
      params.set('pgbouncer', 'true')
    }

    parsed.search = params.toString()
    return parsed.toString()
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
    datasources: {
      db: {
        url: buildDatasourceUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
