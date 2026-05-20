'use client'

import { useAppStore } from '@/lib/store'
import { TrendingUp, TrendingDown, Minus, Flame, Moon } from 'lucide-react'

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

export function StatsCards() {
  const { stats } = useAppStore()

  const hasAvgSleep = stats?.avgSleep != null

  return (
    <div
      className={`grid gap-4 ${
        hasAvgSleep
          ? 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-3'
      }`}
    >
      {/* Всего записей */}
      <div className="bg-[#050508] border border-white/[0.08] p-5 text-center">
        <div className="text-3xl font-semibold text-purple-500 mb-2">
          {stats ? stats.totalEntries : '—'}
        </div>
        <div className="text-xs text-white/50 uppercase tracking-wider">
          Всего записей
        </div>
      </div>

      {/* Среднее настроение */}
      <div className="bg-[#050508] border border-white/[0.08] p-5 text-center">
        <div className="text-3xl font-semibold text-purple-500 mb-2 flex items-center justify-center gap-1.5">
          <span>{stats ? stats.avgMood : '—'}</span>
          {stats && <TrendIcon trend={stats.trend} />}
        </div>
        <div className="text-xs text-white/50 uppercase tracking-wider">
          Среднее настроение
        </div>
      </div>

      {/* Серия дней */}
      <div className="bg-[#050508] border border-white/[0.08] p-5 text-center">
        <div className="text-3xl font-semibold text-purple-500 mb-2">
          <span>{stats ? stats.currentStreak : '—'}</span>
          {stats && <Flame className="w-4 h-4 text-orange-400 inline ml-1" />}
        </div>
        <div className="text-xs text-white/50 uppercase tracking-wider">
          Серия дней
        </div>
      </div>

      {/* Average Sleep (conditionally rendered) */}
      {hasAvgSleep && (
        <div className="bg-[#050508] border border-white/[0.08] p-5 text-center">
          <div className="text-3xl font-semibold text-purple-500 mb-2">
            <span>{stats.avgSleep}</span>
            <Moon className="w-4 h-4 text-blue-400 inline ml-1" />
          </div>
          <div className="text-xs text-white/50 uppercase tracking-wider">
            Ср. сон (ч)
          </div>
        </div>
      )}
    </div>
  )
}
