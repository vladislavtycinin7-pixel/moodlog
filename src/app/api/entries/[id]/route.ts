import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const VALID_MOOD_LABELS = [
  'Отличное',
  'Хорошее',
  'Нейтральное',
  'Грустное',
  'Тревожное',
  'Раздраженное',
  'Уставшее',
]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(_request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params

    const entry = await db.moodEntry.findUnique({
      where: { id },
    })

    if (!entry || entry.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Запись не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, entry })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params

    const existing = await db.moodEntry.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Запись не найдена' },
        { status: 404 }
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

    // Validate date if provided
    if (date !== undefined && !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Неверный формат даты (ожидается YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate moodScore if provided
    if (
      moodScore !== undefined &&
      (typeof moodScore !== 'number' || moodScore < 1 || moodScore > 10)
    ) {
      return NextResponse.json(
        { success: false, message: 'Оценка настроения должна быть от 1 до 10' },
        { status: 400 }
      )
    }

    // Validate moodLabel if provided
    if (moodLabel !== undefined && (typeof moodLabel !== 'string' || !VALID_MOOD_LABELS.includes(moodLabel))) {
      return NextResponse.json(
        { success: false, message: `Настроение должно быть одним из: ${VALID_MOOD_LABELS.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate date if date is being changed
    if (date && date !== existing.date) {
      const duplicate = await db.moodEntry.findUnique({
        where: { userId_date: { userId: user.id, date } },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'Запись за эту дату уже существует' },
          { status: 409 }
        )
      }
    }

    const entry = await db.moodEntry.update({
      where: { id },
      data: {
        ...(date !== undefined && { date }),
        ...(moodScore !== undefined && { moodScore }),
        ...(moodLabel !== undefined && { moodLabel }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(sleepHours !== undefined && { sleepHours: sleepHours != null ? Number(sleepHours) : null }),
        ...(activityLevel !== undefined && { activityLevel: activityLevel != null ? Number(activityLevel) : null }),
        ...(stressLevel !== undefined && { stressLevel: stressLevel != null ? Number(stressLevel) : null }),
        ...(goodThing !== undefined && { goodThing: goodThing || null }),
        ...(badThing !== undefined && { badThing: badThing || null }),
      },
    })

    return NextResponse.json({ success: true, entry })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении записи' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(_request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params

    const existing = await db.moodEntry.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Запись не найдена' },
        { status: 404 }
      )
    }

    await db.moodEntry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении записи' },
      { status: 500 }
    )
  }
}
