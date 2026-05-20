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

  const handleAddEntry = () => {
    setActiveModal('add')
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
      className="fixed top-0 w-full z-50 py-5 border-b border-white/[0.05]"
      style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12 flex justify-between items-center">
        {/* Logo */}
        <span
          className="text-[22px] font-medium text-white cursor-pointer select-none"
          onClick={handleLogoClick}
        >
          MoodLog
        </span>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <span
              className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors"
              onClick={handleAddEntry}
            >
              + Добавить запись
            </span>
          ) : (
            <>
              <span
                className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors"
                onClick={handleLogin}
              >
                Вход
              </span>
              <span
                className="text-white text-sm bg-white/10 px-5 py-2 cursor-pointer hover:bg-white/15 transition-colors"
                onClick={handleRegister}
              >
                Регистрация
              </span>
            </>
          )}
        </div>

        {/* Right side: hamburger (mobile) + settings */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-xl p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Settings gear */}
          <button
            className="text-white/70 hover:text-white hover:rotate-[30deg] transition-all duration-300 bg-transparent border-none cursor-pointer text-xl p-2"
            style={{
              transform: settingsOpen ? 'rotate(180deg)' : undefined,
              transition: 'all 0.3s',
            }}
            onClick={toggleSettings}
            aria-label="Settings"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: mobileOpen ? '300px' : '0px',
          opacity: mobileOpen ? 1 : 0,
        }}
      >
        <div
          className="px-6 sm:px-12 py-4 flex flex-col gap-4"
          style={{
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {isAuthenticated ? (
            <span
              className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors py-1"
              onClick={handleAddEntry}
            >
              + Добавить запись
            </span>
          ) : (
            <>
              <span
                className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors py-1"
                onClick={handleLogin}
              >
                Вход
              </span>
              <span
                className="text-white text-sm bg-white/10 px-5 py-2 cursor-pointer hover:bg-white/15 transition-colors w-fit"
                onClick={handleRegister}
              >
                Регистрация
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
