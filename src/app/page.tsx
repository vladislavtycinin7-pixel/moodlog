'use client'

import { useEffect } from 'react'
import { useAppStore, MainTab, loadToken } from '@/lib/store'
import { CalendarDays, BarChart3, Plus } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import LandingPage from '@/components/landing-page'
import dynamic from 'next/dynamic'
import MoodCalendar from '@/components/mood-calendar'
import { StatsCards } from '@/components/stats-cards'
// Lazy-load recharts — it's ~200KB+ and only needed on the Stats tab
const MoodChart = dynamic(() => import('@/components/mood-chart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center text-white/40 text-sm">Загрузка графика...</div>,
})
import AuthModals from '@/components/auth-modals'
import EntryModals from '@/components/entry-modals'
import SettingsMenu from '@/components/settings-menu'
import ProfileModal from '@/components/profile-modal'

const TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: 'calendar', label: 'Календарь', icon: <CalendarDays size={18} /> },
  { key: 'stats', label: 'Статистика', icon: <BarChart3 size={18} /> },
]

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
  } = useAppStore()

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

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchEntries()
      fetchStats()
    }
  }, [isAuthenticated, fetchEntries, fetchStats])

  // Refresh data when switching to stats tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'stats') {
      const month = useAppStore.getState().calendarMonth
      fetchStats(month)
      fetchEntries(month)
    }
  }, [activeTab, isAuthenticated, fetchStats, fetchEntries])

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
      <SettingsMenu />

      {/* Main content */}
      {isAuthenticated ? (
        <main className="relative z-[1] max-w-[1200px] w-full mx-auto px-3 sm:px-4 md:px-6 pt-[80px] sm:pt-[100px] pb-12 sm:pb-16 flex-1">
          {/* Tab switcher + add entry button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
            <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 border-none rounded-md flex-1 sm:flex-initial ${
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
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 rounded-lg"
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
