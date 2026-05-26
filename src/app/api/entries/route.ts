import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { withRetry } from '@/lib/db-retry'

const VALID_MOOD_LABELS = [
  'Отличное',
  'Хорошее',
  'Нейтральное',
  'Грустное',
  'Тревожное',
  'Раздраженное',
  'Уставшее',
]

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT_LENGTH = 2000
const MAX_SLEEP_HOURS = 24
const MIN_SLEEP_HOURS = 0

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // e.g. "2026-05"

    const where: { userId: string; date?: { gte: string; lt: string } } = {
      userId: user.id,
    }

    // If month param provided, filter entries for that month
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`
      // Calculate next month for range filter
      const [year, mon] = month.split('-').map(Number)
      const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`
      where.date = { gte: startDate, lt: `${nextMonth}-01` }
    }

    const entries = await withRetry(() =>
      db.moodEntry.findMany({
        where,
        orderBy: { date: 'desc' },
      })
    )

    return NextResponse.json({ success: true, entries })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении записей' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      date,
      moodScore,
      moodLabel,
      notes,
      sleepHours,
      activityLevel,
      stressLevel,
      goodThing,
      badThing,
    } = body

    // Validate date format
    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Неверный формат даты (ожидается YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate moodScore: 1-10
    if (
      moodScore === undefined ||
      moodScore === null ||
      typeof moodScore !== 'number' ||
      moodScore < 1 ||
      moodScore > 10
    ) {
      return NextResponse.json(
        { success: false, message: 'Оценка настроения должна быть от 1 до 10' },
        { status: 400 }
      )
    }

    // Validate moodLabel in valid set
    if (!moodLabel || typeof moodLabel !== 'string' || !VALID_MOOD_LABELS.includes(moodLabel)) {
      return NextResponse.json(
        { success: false, message: `Настроение должно быть одним из: ${VALID_MOOD_LABELS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate text field lengths
    const textFields: [string, string | undefined][] = [
      ['Заметки', notes],
      ['Что хорошего', goodThing],
      ['Что плохого', badThing],
    ]
    for (const [name, value] of textFields) {
      if (value && typeof value === 'string' && value.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { success: false, message: `${name}: максимум ${MAX_TEXT_LENGTH} символов` },
          { status: 400 }
        )
      }
    }

    // Validate sleepHours: 0-24
    if (sleepHours != null) {
      const sleep = Number(sleepHours)
      if (isNaN(sleep) || sleep < MIN_SLEEP_HOURS || sleep > MAX_SLEEP_HOURS) {
        return NextResponse.json(
          { success: false, message: `Сон: от ${MIN_SLEEP_HOURS} до ${MAX_SLEEP_HOURS} часов` },
          { status: 400 }
        )
      }
    }

    // Check no existing entry for this date+user (unique constraint)
    const existing = await withRetry(() =>
      db.moodEntry.findUnique({
        where: { userId_date: { userId: user.id, date } },
      })
    )

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Запись за эту дату уже существует' },
        { status: 409 }
      )
    }

    const entry = await withRetry(() =>
      db.moodEntry.create({
        data: {
          date,
          moodScore,
          moodLabel,
          notes: notes || null,
          sleepHours: sleepHours != null ? Number(sleepHours) : null,
          activityLevel: activityLevel != null ? Number(activityLevel) : null,
          stressLevel: stressLevel != null ? Number(stressLevel) : null,
          goodThing: goodThing || null,
          badThing: badThing || null,
          userId: user.id,
        },
      })
    )

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании записи' },
      { status: 500 }
    )
  }
}
