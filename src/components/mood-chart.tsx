'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  subMonths,
  getDay,
  getDate,
  getMonth,
  getYear,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { ru } from 'date-fns/locale/ru'

type Period = 'week' | 'month' | 'year'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="bg-[rgba(18,18,24,0.95)] border border-purple-500/30 px-3 py-2 text-sm rounded-lg">
      <p className="text-white/70">{label}</p>
      <p className="text-purple-400 font-medium">
        {value !== null && value !== undefined
          ? `Настроение: ${value}/10`
          : 'Нет записи'}
      </p>
    </div>
  )
}

const DAY_LABELS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_LABELS_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
]

export default function MoodChart() {
  const [period, setPeriod] = useState<Period>('month')
  const { entries, calendarMonth } = useAppStore()

  const chartData = useMemo(() => {
    if (period === 'week') {
      const now = new Date()
      const days: Date[] = []
      for (let i = 6; i >= 0; i--) {
        days.push(subDays(now, i))
      }

      return days.map((day) => {
        const entry = entries.find((e) => isSameDay(parseISO(e.date), day))
        return {
          label: DAY_LABELS_SHORT[(getDay(day) + 6) % 7],
          value: entry ? entry.moodScore : null,
        }
      })
    }

    if (period === 'month') {
      const [yearStr, monthStr] = calendarMonth.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10) - 1
      const monthDate = new Date(year, month, 1)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const days = eachDayOfInterval({ start, end })

      return days.map((day) => {
        const entry = entries.find((e) => isSameDay(parseISO(e.date), day))
        const dayNum = getDate(day)
        return {
          label: `${dayNum}`,
          value: entry ? entry.moodScore : null,
        }
      })
    }

    if (period === 'year') {
      const now = new Date()
      const yearStart = startOfYear(now)
      const yearEnd = endOfYear(now)
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

      return months.map((monthDate) => {
        const monthEntries = entries.filter((e) =>
          isSameMonth(parseISO(e.date), monthDate)
        )
        const avg =
          monthEntries.length > 0
            ? Math.round(
                (monthEntries.reduce((sum, e) => sum + e.moodScore, 0) /
                  monthEntries.length) *
                  10
              ) / 10
            : null
        return {
          label: MONTH_LABELS_SHORT[getMonth(monthDate)],
          value: avg,
        }
      })
    }

    return []
  }, [period, entries, calendarMonth])

  // Dynamic X-axis interval: on mobile show fewer labels
  const xAxisInterval = useMemo(() => {
    if (period === 'month') {
      // Show every Nth label depending on data length
      // On small screens, show ~5-7 labels max
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        return Math.max(Math.floor(chartData.length / 5), 2)
      }
      return Math.floor(chartData.length / 10)
    }
    return 0
  }, [period, chartData.length])

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[4px] p-4 sm:p-6 rounded-xl">
      {/* Period selector */}
      <div className="flex gap-2 sm:gap-3 justify-end mb-4 sm:mb-6">
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base cursor-pointer transition-colors rounded-md ${
            period === 'week'
              ? 'bg-purple-500 border border-purple-500 text-white'
              : 'bg-transparent border border-white/20 text-white/70 hover:border-purple-500'
          }`}
        >
          Неделя
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base cursor-pointer transition-colors rounded-md ${
            period === 'month'
              ? 'bg-purple-500 border border-purple-500 text-white'
              : 'bg-transparent border border-white/20 text-white/70 hover:border-purple-500'
          }`}
        >
          Месяц
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base cursor-pointer transition-colors rounded-md ${
            period === 'year'
              ? 'bg-purple-500 border border-purple-500 text-white'
              : 'bg-transparent border border-white/20 text-white/70 hover:border-purple-500'
          }`}
        >
          Год
        </button>
      </div>

      {/* Chart */}
      <div className="h-[260px] sm:h-[280px] md:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval={xAxisInterval}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{
                fill: '#a855f7',
                stroke: '#ffffff',
                strokeWidth: 1.5,
                r: 4,
              }}
              activeDot={{
                fill: '#a855f7',
                stroke: '#ffffff',
                strokeWidth: 2,
                r: 6,
              }}
              connectNulls={false}
              fill="url(#moodGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/[0.08] flex gap-4 sm:gap-5 flex-wrap text-xs sm:text-sm text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500" />
          Есть запись
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 sm:w-5 h-0.5 bg-purple-500" />
          Линия настроения
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 sm:w-5 h-0 border-b-2 border-dashed border-purple-500/50" />
          Пропуск
        </span>
      </div>

      {/* Info note */}
      <div className="mt-3 sm:mt-4 bg-purple-500/10 border-l-2 border-purple-500 px-4 sm:px-4 py-3 sm:py-3 text-xs sm:text-sm text-white/60 leading-relaxed">
        Пропуски в графике означают дни, когда вы не делали запись. Чем чаще
        заполняете дневник, тем точнее график.
      </div>
    </div>
  )
}
