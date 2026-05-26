'use client'

import { useAppStore } from '@/lib/store'
import { getMoodColor, MOOD_LABELS } from '@/lib/mood-colors'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Moon,
  Trophy,
} from 'lucide-react'

/* ── Trend icon helper ───────────────────────────────────────── */

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-emerald-400" />
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-400" />
    case 'stable':
      return <Minus className="w-4 h-4 text-white/40" />
  }
}

/* ── Single stat card ────────────────────────────────────────── */

interface StatCardProps {
  value: React.ReactNode
  label: string
  icon?: React.ReactNode
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[4px] p-4 sm:p-5 text-center rounded-xl">
      <div className="text-2xl sm:text-3xl font-semibold text-purple-500 mb-1 sm:mb-2 flex items-center justify-center gap-1">
        <span className="truncate">{value}</span>
        {icon}
      </div>
      <div className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider leading-tight">
        {label}
      </div>
    </div>
  )
}

/* ── Mood distribution bar ───────────────────────────────────── */

function MoodDistribution({
  distribution,
  total,
}: {
  distribution: Record<string, number>
  total: number
}) {
  // Sort by intuitive mood order: positive at top → negative at bottom
  const moodOrder = Object.fromEntries(MOOD_LABELS.map((label, i) => [label, i]))
  const entries = Object.entries(distribution).sort(
    (a, b) => (moodOrder[a[0]] ?? 99) - (moodOrder[b[0]] ?? 99)
  )

  if (entries.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[4px] p-8 text-center rounded-xl">
        <p className="text-white/30 text-sm">
          Пока нет данных для распределения эмоций
        </p>
      </div>
    )
  }

  const maxCount = Math.max(...entries.map(([, count]) => count))

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[4px] p-4 sm:p-6 rounded-xl">
      <div className="space-y-3 sm:space-y-4">
        {entries.map(([label, count]) => {
          const color = getMoodColor(label)
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

          return (
            <div key={label} className="flex items-center gap-2 sm:gap-3">
              {/* Label */}
              <span
                className="text-xs sm:text-sm w-24 sm:w-28 shrink-0 truncate"
                style={{ color }}
              >
                {label}
              </span>

              {/* Bar track */}
              <div className="flex-1 h-5 sm:h-5 bg-white/[0.04] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>

              {/* Count + percentage */}
              <span className="text-[11px] sm:text-xs text-white/50 w-14 sm:w-16 text-right shrink-0 tabular-nums whitespace-nowrap">
                {count} <span className="text-white/30">({percentage}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */

export function StatsCards() {
  const { stats } = useAppStore()

  const hasAvgSleep = stats?.avgSleep != null
  const distributionTotal = stats
    ? Object.values(stats.moodDistribution).reduce((s, c) => s + c, 0)
    : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Section 1: Общая ──────────────────────────────────── */}
      <section>
        <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Общая</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Всего записей */}
          <StatCard
            value={stats ? stats.totalEntries : '—'}
            label="Всего записей"
          />

          {/* Среднее настроение */}
          <StatCard
            value={stats ? stats.avgMood : '—'}
            label="Среднее настроение"
            icon={stats ? <TrendIcon trend={stats.trend} /> : undefined}
          />

          {/* Частая эмоция */}
          <StatCard
            value={
              stats?.mostFrequentMood ? (
                <span
                  style={{ color: getMoodColor(stats.mostFrequentMood) }}
                >
                  {stats.mostFrequentMood}
                </span>
              ) : (
                '—'
              )
            }
            label="Частая эмоция"
          />

          {/* Средний сон */}
          <StatCard
            value={hasAvgSleep ? stats!.avgSleep : '—'}
            label="Средний сон"
            icon={
              hasAvgSleep ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : undefined
            }
          />

          {/* Серия дней */}
          <StatCard
            value={stats ? stats.currentStreak : '—'}
            label="Серия дней"
            icon={<Flame className="w-4 h-4 text-orange-400" />}
          />

          {/* Рекорд серии */}
          <StatCard
            value={stats ? stats.longestStreak : '—'}
            label="Рекорд серии"
            icon={<Trophy className="w-4 h-4 text-yellow-400" />}
          />
        </div>
      </section>

      {/* ── Section 2: Распределение эмоций ───────────────────── */}
      <section>
        <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">
          Распределение эмоций
        </h3>

        <MoodDistribution
          distribution={stats?.moodDistribution ?? {}}
          total={distributionTotal}
        />
      </section>
    </div>
  )
}
