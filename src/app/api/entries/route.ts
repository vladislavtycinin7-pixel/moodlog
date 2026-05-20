import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

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

    return NextResponse.json({ success: true, entries })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении записей' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request)
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

    // Validate date
    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Неверный формат даты (ожидается YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate moodScore
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

    // Validate moodLabel
    if (!moodLabel || typeof moodLabel !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Укажите настроение' },
        { status: 400 }
      )
    }

    // Check for duplicate date
    const existing = await db.moodEntry.findUnique({
      where: { userId_date: { userId: user.id, date } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Запись за эту дату уже существует' },
        { status: 409 }
      )
    }

    const entry = await db.moodEntry.create({
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

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании записи' },
      { status: 500 }
    )
  }
}
