import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/stats/public?token=xxx
 * Return public stats for a user by share token.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Токен не указан' },
        { status: 400 }
      )
    }

    // Find user by share token
    const user = await db.user.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Ссылка недействительна' },
        { status: 404 }
      )
    }

    // Get all entries for stats calculation
    const entries = await db.moodEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        moodScore: true,
        moodLabel: true,
        sleepHours: true,
      },
    })

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        user: { username: user.username, avatarUrl: user.avatarUrl },
        stats: {
          totalEntries: 0,
          avgMood: 0,
          currentStreak: 0,
          longestStreak: 0,
          moodDistribution: {},
          trend: 'stable',
          avgSleep: null,
          mostFrequentMood: null,
        },
      })
    }

    // Calculate stats (same logic as entries/stats)
    const totalEntries = entries.length
    const avgMood = Math.round(
      (entries.reduce((sum, e) => sum + e.moodScore, 0) / totalEntries) * 10
    ) / 10

    // Streaks
    const entryDates = new Set(entries.map(e => e.date))

    let currentStreak = 0
    const today = new Date()
    const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (entryDates.has(dateStr)) {
        currentStreak++
      } else {
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const sortedDates = entries.map(e => e.date).sort()
    let longestStreak = 0
    let tempStreak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, sortedDates.length > 0 ? 1 : 0)

    // Mood distribution
    const moodDistribution: Record<string, number> = {}
    for (const entry of entries) {
      moodDistribution[entry.moodLabel] = (moodDistribution[entry.moodLabel] || 0) + 1
    }

    // Most frequent mood
    let mostFrequentMood: string | null = null
    let maxCount = 0
    for (const [label, count] of Object.entries(moodDistribution)) {
      if (count > maxCount) {
        maxCount = count
        mostFrequentMood = label
      }
    }

    // Trend
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (entries.length >= 3) {
      const mid = Math.floor(entries.length / 2)
      const firstHalfAvg = entries.slice(0, mid).reduce((s, e) => s + e.moodScore, 0) / mid
      const secondHalfAvg = entries.slice(mid).reduce((s, e) => s + e.moodScore, 0) / (entries.length - mid)
      const diff = secondHalfAvg - firstHalfAvg
      if (diff > 0.5) trend = 'up'
      else if (diff < -0.5) trend = 'down'
    }

    // Average sleep
    const sleepEntries = entries.filter(e => e.sleepHours !== null)
    const avgSleep = sleepEntries.length > 0
      ? Math.round((sleepEntries.reduce((sum, e) => sum + (e.sleepHours ?? 0), 0) / sleepEntries.length) * 10) / 10
      : null

    return NextResponse.json({
      success: true,
      user: { username: user.username, avatarUrl: user.avatarUrl },
      stats: {
        totalEntries,
        avgMood,
        currentStreak,
        longestStreak,
        moodDistribution,
        trend,
        avgSleep,
        mostFrequentMood,
      },
    })
  } catch (error) {
    console.error('[stats/public] GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Ошибка' },
      { status: 500 }
    )
  }
}
