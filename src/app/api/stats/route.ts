import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // e.g. "2026-05"

    // Default to current month if not provided
    let filterMonth = month
    if (!filterMonth || !/^\d{4}-\d{2}$/.test(filterMonth)) {
      const now = new Date()
      filterMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // Calculate date range for the month
    const startDate = `${filterMonth}-01`
    const [year, mon] = filterMonth.split('-').map(Number)
    const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`
    const endDate = `${nextMonth}-01`

    const entries = await db.moodEntry.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: 'asc' },
    })

    if (entries.length === 0) {
      return NextResponse.json({
        totalEntries: 0,
        avgMood: 0,
        bestDay: null,
        worstDay: null,
        currentStreak: 0,
        longestStreak: 0,
        moodDistribution: {},
        trend: 'stable',
        avgSleep: null,
        mostFrequentMood: null,
      })
    }

    // Total entries
    const totalEntries = entries.length

    // Average mood
    const avgMood = Math.round(
      (entries.reduce((sum, e) => sum + e.moodScore, 0) / totalEntries) * 10
    ) / 10

    // Best day (highest mood score date)
    const bestEntry = entries.reduce((best, e) =>
      e.moodScore > best.moodScore ? e : best
    , entries[0])
    const bestDay = bestEntry.date

    // Worst day (lowest mood score date)
    const worstEntry = entries.reduce((worst, e) =>
      e.moodScore < worst.moodScore ? e : worst
    , entries[0])
    const worstDay = worstEntry.date

    // Current streak and longest streak (consecutive days with entries)
    // For current streak: count backwards from today
    const allEntries = await db.moodEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      select: { date: true },
    })
    const entryDates = new Set(allEntries.map(e => e.date))

    // Current streak: consecutive days from today backwards
    let currentStreak = 0
    const today = new Date()
    const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (entryDates.has(dateStr)) {
        currentStreak++
      } else {
        // If no entry today, allow starting from yesterday
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Longest streak: iterate all dates
    const sortedDates = allEntries.map(e => e.date).sort()
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

    // Trend: compare first half avg vs second half avg of the month
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (entries.length >= 3) {
      const mid = Math.floor(entries.length / 2)
      const firstHalfAvg = entries.slice(0, mid).reduce((s, e) => s + e.moodScore, 0) / mid
      const secondHalfAvg = entries.slice(mid).reduce((s, e) => s + e.moodScore, 0) / (entries.length - mid)
      const diff = secondHalfAvg - firstHalfAvg
      if (diff > 0.5) trend = 'up'
      else if (diff < -0.5) trend = 'down'
      else trend = 'stable'
    }

    // Average sleep
    const sleepEntries = entries.filter(e => e.sleepHours !== null)
    const avgSleep = sleepEntries.length > 0
      ? Math.round((sleepEntries.reduce((sum, e) => sum + (e.sleepHours ?? 0), 0) / sleepEntries.length) * 10) / 10
      : null

    return NextResponse.json({
      totalEntries,
      avgMood,
      bestDay,
      worstDay,
      currentStreak,
      longestStreak,
      moodDistribution,
      trend,
      avgSleep,
      mostFrequentMood,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении статистики' },
      { status: 500 }
    )
  }
}
