'use client'

import { Menu, X, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, setActiveModal, settingsOpen, setSettingsOpen, setActiveTab } =
    useAppStore()

  const handleLogoClick = () => {
    setActiveTab('calendar')
    setActiveModal(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMobileOpen(false)
  }

  const handleLogin = () => {
    setActiveModal('login')
    setMobileOpen(false)
  }

  const handleRegister = () => {
    setActiveModal('register')
    setMobileOpen(false)
  }

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen)
  }

  return (
    <nav
      className="fixed top-0 w-full z-50 py-4 sm:py-5 border-b border-white/[0.05]"
      style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 flex justify-between items-center">
        {/* Logo */}
        <span
          className="text-xl sm:text-[22px] font-medium text-white cursor-pointer select-none"
          onClick={handleLogoClick}
        >
          MoodLog
        </span>

        {/* Desktop: guest auth buttons */}
        {!isAuthenticated && (
          <div className="hidden md:flex items-center gap-6">
            <button
              type="button"
              className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors bg-transparent border-none p-0 font-[inherit]"
              onClick={handleLogin}
            >
              Вход
            </button>
            <button
              type="button"
              className="text-white text-sm bg-white/10 px-5 py-2.5 cursor-pointer hover:bg-white/15 transition-colors border-none font-[inherit] rounded-lg"
              onClick={handleRegister}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* Right side: hamburger (mobile) + settings */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger (guests only) */}
          {!isAuthenticated && (
            <button
              className="md:hidden text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-2.5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          )}

          {/* Settings gear */}
          {isAuthenticated && (
            <button
              className="text-white/70 hover:text-white hover:rotate-[30deg] transition-all duration-300 bg-transparent border-none cursor-pointer p-2.5"
              style={{
                transform: settingsOpen ? 'rotate(180deg)' : undefined,
                transition: 'all 0.3s',
              }}
              onClick={toggleSettings}
              aria-label="Settings"
            >
              <Settings size={26} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu (guests only) */}
      {!isAuthenticated && (
        <div
          className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: mobileOpen ? '300px' : '0px',
            opacity: mobileOpen ? 1 : 0,
          }}
        >
          <div
            className="px-5 sm:px-12 py-5 flex flex-col gap-4"
            style={{
              background: 'rgba(10, 10, 15, 0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <button
              type="button"
              className="text-white/70 text-base cursor-pointer hover:text-white transition-colors py-2 bg-transparent border-none p-0 font-[inherit]"
              onClick={handleLogin}
            >
              Вход
            </button>
            <button
              type="button"
              className="text-white text-base bg-white/10 px-5 py-3 cursor-pointer hover:bg-white/15 transition-colors w-fit border-none font-[inherit] rounded-lg"
              onClick={handleRegister}
            >
              Регистрация
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
