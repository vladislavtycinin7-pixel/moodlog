import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const entries = await db.moodEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
    })

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalEntries: 0,
          avgMood: 0,
          bestDay: null,
          worstDay: null,
          currentStreak: 0,
          moodDistribution: {},
        },
      })
    }

    // Total entries
    const totalEntries = entries.length

    // Average mood
    const avgMood = Math.round(
      (entries.reduce((sum, e) => sum + e.moodScore, 0) / totalEntries) * 10
    ) / 10

    // Best day (highest mood score, most recent if tie)
    const bestEntry = entries.reduce((best, e) =>
      e.moodScore > best.moodScore ? e : best
    , entries[0])

    // Worst day (lowest mood score, most recent if tie)
    const worstEntry = entries.reduce((worst, e) =>
      e.moodScore < worst.moodScore ? e : worst
    , entries[0])

    const bestDay = { date: bestEntry.date, moodScore: bestEntry.moodScore }
    const worstDay = { date: worstEntry.date, moodScore: worstEntry.moodScore }

    // Current streak (consecutive days from today backwards)
    let currentStreak = 0
    const entryDates = new Set(entries.map(e => e.date))

    const today = new Date()
    const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Start from today and go backwards
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (entryDates.has(dateStr)) {
        currentStreak++
      } else {
        // If no entry today, check if there was one yesterday to start counting
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Mood distribution
    const moodDistribution: Record<string, number> = {}
    for (const entry of entries) {
      moodDistribution[entry.moodLabel] = (moodDistribution[entry.moodLabel] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEntries,
        avgMood,
        bestDay,
        worstDay,
        currentStreak,
        moodDistribution,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении статистики' },
      { status: 500 }
    )
  }
}
