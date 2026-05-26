'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAppStore, MainTab, loadToken } from '@/lib/store'
import { CalendarDays, BarChart3, Plus } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import LandingPage from '@/components/landing-page'
import dynamic from 'next/dynamic'
import MoodCalendar from '@/components/mood-calendar'
import { StatsCards } from '@/components/stats-cards'
import { getMoodColor, MOOD_LABELS } from '@/lib/mood-colors'
// Lazy-load recharts — it's ~200KB+ and only needed on the Stats tab
const MoodChart = dynamic(() => import('@/components/mood-chart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">Загрузка графика...</div>,
})
import AuthModals from '@/components/auth-modals'
import EntryModals from '@/components/entry-modals'
import SettingsMenu from '@/components/settings-menu'
import ProfileModal from '@/components/profile-modal'
import ShareStatsModal from '@/components/share-stats-modal'

const TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: 'calendar', label: 'Календарь', icon: <CalendarDays size={18} /> },
  { key: 'stats', label: 'Статистика', icon: <BarChart3 size={18} /> },
]

/* ─── Public shared stats view ─── */
function PublicStatsView({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await fetch(`/api/stats/public?token=${token}`)
        const result = await res.json()
        if (result.success) {
          setData(result)
        } else {
          setError(result.message || 'Ошибка')
        }
      } catch {
        setError('Ошибка соединения')
      } finally {
        setLoading(false)
      }
    }
    fetchPublicStats()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 text-sm">Загрузка статистики...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-white/50 text-sm">{error}</p>
          <a href="/" className="text-purple-400 text-sm mt-4 inline-block hover:underline">
            На главную
          </a>
        </div>
      </div>
    )
  }

  const { user: shareUser, stats: shareStats } = data
  const avatarLetter = shareUser.username ? shareUser.username.charAt(0).toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div
        className="fixed -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(139,92,246,0.4), transparent 60%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.3), transparent 60%), radial-gradient(circle at 50% 20%, rgba(168,85,247,0.35), transparent 50%)',
          filter: 'blur(80px)',
        }}
      />

      <nav
        className="fixed top-0 w-full z-50 py-4 border-b border-white/[0.05]"
        style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(24px)' }}
      >
        <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between">
          <span className="text-xl font-medium text-white cursor-pointer">MoodLog</span>
          <a href="/" className="text-sm text-purple-400 hover:underline">Начать свой дневник</a>
        </div>
      </nav>

      <main className="relative z-[1] max-w-[600px] mx-auto px-5 pt-[100px] pb-16">
        {/* User header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-3 overflow-hidden">
            {shareUser.avatarUrl ? (
              <img src={shareUser.avatarUrl} alt="Аватар" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-medium rounded-full">
                {avatarLetter}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-medium">@{shareUser.username}</h1>
          <p className="text-sm text-white/40 mt-1">Статистика настроения</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
            <div className="text-2xl font-semibold text-purple-500">{shareStats.totalEntries}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Записей</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
            <div className="text-2xl font-semibold text-purple-500">{shareStats.avgMood}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Среднее</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
            <div className="text-2xl font-semibold text-purple-500">{shareStats.currentStreak}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Серия</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
            <div className="text-2xl font-semibold text-purple-500">{shareStats.longestStreak}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Рекорд серии</div>
          </div>
          {shareStats.mostFrequentMood && (
            <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
              <div className="text-lg font-semibold" style={{ color: getMoodColor(shareStats.mostFrequentMood) }}>
                {shareStats.mostFrequentMood}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Частая эмоция</div>
            </div>
          )}
          {shareStats.avgSleep != null && (
            <div className="bg-white/[0.03] border border-white/[0.08] p-4 text-center rounded-xl">
              <div className="text-2xl font-semibold text-purple-500">{shareStats.avgSleep}ч</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Средний сон</div>
            </div>
          )}
        </div>

        {/* Mood distribution */}
        {Object.keys(shareStats.moodDistribution).length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-xl">
            <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">
              Распределение эмоций
            </h3>
            <div className="space-y-3">
              {Object.entries(shareStats.moodDistribution).map(([label, count]: [string, any]) => {
                const percentage = shareStats.totalEntries > 0 ? Math.round((count / shareStats.totalEntries) * 100) : 0
                const maxCount = Math.max(...Object.values(shareStats.moodDistribution) as number[])
                const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs w-24 shrink-0 truncate" style={{ color: getMoodColor(label) }}>
                      {label}
                    </span>
                    <div className="flex-1 h-4 bg-white/[0.04] rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{ width: `${barWidth}%`, backgroundColor: getMoodColor(label), opacity: 0.8 }}
                      />
                    </div>
                    <span className="text-[11px] text-white/40 w-12 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-white/30">
          Создано в <span className="text-purple-400">MoodLog</span> — дневник настроения
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  const {
    isAuthenticated,
    isAuthLoading,
    setUser,
    fetchEntries,
    fetchStats,
    activeTab,
    setActiveTab,
    setActiveModal,
    setPendingEntryDate,
    calendarMonth,
  } = useAppStore()

  // Check for ?share=TOKEN in URL (useMemo to avoid lint issue with setState in effect)
  const shareToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  }, [])

  // Check session on mount — use Authorization header with stored token
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = loadToken()
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await fetch('/api/auth/session', { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
          } else {
            setUser(null)
          }
        }
      } catch {
        setUser(null)
      }
    }
    checkSession()
  }, [setUser])

  // Fetch data when authenticated, tab changes, or calendar month changes
  useEffect(() => {
    if (!isAuthenticated) return
    fetchEntries(calendarMonth)
    fetchStats(calendarMonth)
  }, [isAuthenticated, calendarMonth, activeTab, fetchEntries, fetchStats])

  // ─── Public share view ───
  if (shareToken) {
    return <PublicStatsView token={shareToken} />
  }

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 text-sm">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Background gradient (always visible) */}
      <div
        className="fixed -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(139,92,246,0.4), transparent 60%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.3), transparent 60%), radial-gradient(circle at 50% 20%, rgba(168,85,247,0.35), transparent 50%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Navbar */}
      <Navbar />

      {/* Modals */}
      <AuthModals />
      <EntryModals />
      <ProfileModal />
      <ShareStatsModal />
      <SettingsMenu />

      {/* Main content */}
      {isAuthenticated ? (
        <main className="relative z-[1] max-w-[1200px] w-full mx-auto px-4 sm:px-4 md:px-6 pt-[80px] sm:pt-[100px] pb-12 sm:pb-16 flex-1">
          {/* Tab switcher + add entry button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-8">
            <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 px-5 sm:px-5 py-3 sm:py-2.5 text-sm sm:text-sm font-medium cursor-pointer transition-all duration-200 border-none rounded-md flex-1 sm:flex-initial ${
                    activeTab === tab.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-transparent text-white/50 hover:text-white/80'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setPendingEntryDate(null); setActiveModal('add') }}
              className="flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 rounded-lg"
            >
              <Plus size={18} />
              Добавить запись
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'calendar' && <MoodCalendar />}
          {activeTab === 'stats' && (
            <div className="space-y-8">
              <StatsCards />
              <MoodChart />
            </div>
          )}
        </main>
      ) : (
        <LandingPage />
      )}

      {/* Footer (only for authenticated users) */}
      {isAuthenticated && (
        <Footer className="relative z-[1]" />
      )}
    </div>
  )
}
