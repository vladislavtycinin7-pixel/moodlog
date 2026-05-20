'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import Navbar from '@/components/navbar'
import LandingPage from '@/components/landing-page'
import MoodCalendar from '@/components/mood-calendar'
import { StatsCards } from '@/components/stats-cards'
import MoodChart from '@/components/mood-chart'
import AuthModals from '@/components/auth-modals'
import EntryModals from '@/components/entry-modals'
import SettingsMenu from '@/components/settings-menu'

export default function Home() {
  const { isAuthenticated, isAuthLoading, setUser, setAuthLoading, fetchEntries, fetchStats } = useAppStore()

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
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
      <SettingsMenu />

      {/* Main content */}
      {isAuthenticated ? (
        <main className="relative z-[1] max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-[100px] pb-16 flex-1">
          {/* Calendar */}
          <MoodCalendar />

          {/* Stats cards */}
          <div className="mt-8">
            <StatsCards />
          </div>

          {/* Chart section */}
          <div id="chart-section" className="mt-8 scroll-mt-20">
            <MoodChart />
          </div>
        </main>
      ) : (
        <LandingPage />
      )}

      {/* Footer (only for authenticated users) */}
      {isAuthenticated && (
        <footer className="relative z-[1] bg-[#08080c] border-t border-white/[0.08] px-6 sm:px-12 py-10 mt-auto">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-white/50">
              © 2026 MoodLog — твой личный дневник настроения
            </span>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className="cursor-pointer hover:text-white transition-colors">
                Политика конфиденциальности
              </span>
              <span>·</span>
              <span className="cursor-pointer hover:text-white transition-colors">
                Поддержка
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
