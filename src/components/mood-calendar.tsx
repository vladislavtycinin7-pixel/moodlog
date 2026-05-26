'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore, MoodEntry } from '@/lib/store'
import { getMoodColor, getMoodColorDef } from '@/lib/mood-colors'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  subDays,
  addDays,
  isSameMonth,
  isToday as isTodayFn,
} from 'date-fns'
import { ru } from 'date-fns/locale/ru'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function MoodCalendar() {
  const {
    entries,
    calendarMonth,
    setCalendarMonth,
    fetchEntries,
    fetchStats,
    setSelectedEntry,
    setActiveModal,
    setPendingEntryDate,
  } = useAppStore()

  const [clickedDate, setClickedDate] = useState<string | null>(null)

  // Parse the current calendar month into a Date
  const currentDate = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }, [calendarMonth])

  // Build a map of date string -> entry for quick lookup
  const entryMap = useMemo(() => {
    const map = new Map<string, MoodEntry>()
    for (const entry of entries) {
      map.set(entry.date, entry)
    }
    return map
  }, [entries])

  // Calculate all calendar days (including prev/next month padding)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)

    // Get the day of week for the first day (0=Sunday in JS)
    // We need Monday=0, so we adjust: (getDay + 6) % 7
    const startDayOfWeek = (getDay(monthStart) + 6) % 7

    // Days from previous month to fill the start
    const prevMonthDays: Date[] = []
    if (startDayOfWeek > 0) {
      const prevMonth = subMonths(currentDate, 1)
      const prevMonthEnd = endOfMonth(prevMonth)
      const prevDays = eachDayOfInterval({
        start: subDays(prevMonthEnd, startDayOfWeek - 1),
        end: prevMonthEnd,
      })
      prevMonthDays.push(...prevDays)
    }

    // Current month days
    const currentMonthDays = eachDayOfInterval({
      start: monthStart,
      end: monthEnd,
    })

    // Days from next month to fill the end
    const totalCells = prevMonthDays.length + currentMonthDays.length
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
    const nextMonthDays: Date[] = []
    if (remainingCells > 0) {
      const nextMonth = addMonths(currentDate, 1)
      const nextMonthStart = startOfMonth(nextMonth)
      const nextDays = eachDayOfInterval({
        start: nextMonthStart,
        end: addDays(nextMonthStart, remainingCells - 1),
      })
      nextMonthDays.push(...nextDays)
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]
  }, [currentDate])

  // Navigate to previous month
  const goToPrevMonth = () => {
    const prev = subMonths(currentDate, 1)
    const newMonth = format(prev, 'yyyy-MM')
    setCalendarMonth(newMonth)
  }

  // Navigate to next month
  const goToNextMonth = () => {
    const next = addMonths(currentDate, 1)
    const newMonth = format(next, 'yyyy-MM')
    setCalendarMonth(newMonth)
  }

  // Fetch entries and stats when month changes
  useEffect(() => {
    fetchEntries(calendarMonth)
    fetchStats(calendarMonth)
  }, [calendarMonth, fetchEntries, fetchStats])

  // Handle day click
  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setClickedDate(dateStr)

    const entry = entryMap.get(dateStr)
    if (entry) {
      setSelectedEntry(entry)
      setActiveModal('view')
    } else {
      setSelectedEntry(null)
      setPendingEntryDate(dateStr)
      setActiveModal('add')
    }
  }

  // Format month title in Russian
  const monthTitle = format(currentDate, 'LLLL yyyy', { locale: ru })
  const capitalizedTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[4px] p-3 sm:p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium text-white">{capitalizedTitle}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="bg-transparent border border-white/20 text-white cursor-pointer px-2.5 sm:px-3 py-1.5 hover:border-purple-500 hover:bg-purple-500/10 transition-colors rounded-lg"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="bg-transparent border border-white/20 text-white cursor-pointer px-2.5 sm:px-3 py-1.5 hover:border-purple-500 hover:bg-purple-500/10 transition-colors rounded-lg"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-white/50 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const entry = entryMap.get(dateStr)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isTodayFn(day)
          const moodDef = entry ? getMoodColorDef(entry.moodLabel) : null

          // Build class names based on states
          let cellClass =
            'text-center py-2 sm:py-3 px-0.5 sm:px-2 text-xs sm:text-sm cursor-pointer transition-all border bg-white/[0.02] rounded sm:rounded-none '

          // Border state
          if (isToday) {
            cellClass += 'border-purple-500 '
          } else if (entry) {
            cellClass += 'border-purple-500/50 '
          } else {
            cellClass += 'border-transparent '
          }

          // Background state
          if (isToday) {
            cellClass += 'bg-purple-500/15 shadow-[0_0_8px_rgba(168,85,247,0.3)] '
          } else if (entry) {
            cellClass += 'bg-purple-500/10 '
          }

          // Hover states
          if (!entry && !isToday) {
            cellClass += 'hover:border-purple-500/40 hover:bg-purple-500/5 '
          }

          // Text color for other month days
          const textClass = isCurrentMonth ? 'text-white' : 'text-white/20'

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              className={cellClass}
              aria-label={`${format(day, 'd MMMM', { locale: ru })}${entry ? `, настроение: ${entry.moodScore}` : ''}`}
            >
              <span className={textClass}>{format(day, 'd')}</span>
              {entry && (
                <div
                  className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full mx-auto mt-0.5 sm:mt-1"
                  style={{
                    backgroundColor: getMoodColor(entry.moodLabel),
                    boxShadow: `0 0 4px ${getMoodColorDef(entry.moodLabel).shadowRgba}`,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
