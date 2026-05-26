import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Build the datasource URL for Prisma in production (Vercel serverless).
 *
 * Appends query params to the DATABASE_URL:
 * - connection_limit=1: each serverless function holds only 1 connection
 * - pool_timeout=20: wait up to 20s to acquire a connection
 * - pgbouncer=true: disable prepared statements (required for Supabase transaction mode)
 *
 * Uses simple string concatenation instead of URL parsing to avoid issues
 * with special characters in the password.
 */
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined

  // Only modify URL in production (serverless)
  if (process.env.NODE_ENV !== 'production') return url

  // Don't modify if params already present
  if (url.includes('connection_limit=')) return url

  // Detect Supabase pooler hostname (for pgbouncer flag)
  const isPooler = url.includes('pooler.supabase.com')

  // Simple string append — avoids URL parsing issues with encoded passwords
  const separator = url.includes('?') ? '&' : '?'
  let result = `${url}${separator}connection_limit=1&pool_timeout=20`
  if (isPooler) {
    result += '&pgbouncer=true'
  }

  return result
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
