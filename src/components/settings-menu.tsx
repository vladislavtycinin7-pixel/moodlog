'use client'

import { useEffect } from 'react'
import { User, Palette, BarChart3, LogOut, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export default function SettingsMenu() {
  const { settingsOpen, setSettingsOpen, user, logout } = useAppStore()

  const close = () => setSettingsOpen(false)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (settingsOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [settingsOpen])

  const handleThemeClick = () => {
    toast('Смена темы будет доступна позже')
  }

  const handleStatsClick = () => {
    const el = document.getElementById('chart-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    close()
  }

  const handleLogout = async () => {
    await logout()
    toast('Вы вышли из аккаунта')
    close()
  }

  const avatarLetter = user?.username ? user.username.charAt(0).toUpperCase() : '?'
  const displayName = user?.username ?? 'Гость'
  const displayEmail = user?.username ? `${user.username}@moodlog.com` : ''

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[150] transition-all duration-300 ${
          settingsOpen ? 'visible opacity-1' : 'invisible opacity-0'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Side menu */}
      <div
        className={`fixed top-0 right-0 w-[300px] max-[700px]:w-[280px] h-full z-[200] flex flex-col pt-20 px-6 pb-6 transition-all duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.4,1.1)] ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(18, 18, 24, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Close button */}
        <button
          className="absolute top-6 right-5 text-white/50 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          onClick={close}
          aria-label="Close settings"
        >
          <X size={20} />
        </button>

        {/* Profile section */}
        <div className="text-center pb-7 mb-7 border-b border-white/[0.08]">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[22px] font-medium mx-auto mb-3.5 rounded-full">
            {avatarLetter}
          </div>
          <div className="text-[17px] font-medium mb-1">{displayName}</div>
          <div className="text-xs text-white/45">{displayEmail}</div>
        </div>

        {/* Menu items */}
        <div className="flex-1">
          {/* Профиль */}
          <div
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/75 hover:text-white hover:border-b hover:border-purple-500"
            onClick={() => toast('Профиль: настройка личных данных')}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Профиль</span>
          </div>

          {/* Тема */}
          <div
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/75 hover:text-white hover:border-b hover:border-purple-500"
            onClick={handleThemeClick}
          >
            <Palette className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Тема</span>
          </div>

          {/* Статистика */}
          <div
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/75 hover:text-white hover:border-b hover:border-purple-500"
            onClick={handleStatsClick}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Статистика</span>
          </div>
        </div>

        {/* Logout item */}
        <div
          className="flex items-center gap-3.5 py-3.5 px-3 cursor-pointer transition-colors text-red-400/80 hover:text-red-400 hover:border-b hover:border-red-400 pt-5 mt-5 border-t border-white/[0.08]"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-[450] tracking-[0.3px]">Выйти</span>
        </div>
      </div>
    </>
  )
}
