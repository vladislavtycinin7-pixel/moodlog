'use client'

import { useEffect, useState } from 'react'
import { User, Palette, LogOut, X, Globe, Check } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

const THEMES = [
  { code: 'dark', label: 'Тёмная', desc: 'Текущая тема' },
  { code: 'light', label: 'Светлая', desc: 'Скоро' },
  { code: 'auto', label: 'Авто', desc: 'Скоро' },
]

export default function SettingsMenu() {
  const { settingsOpen, setSettingsOpen, user, logout, setActiveModal } = useAppStore()

  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [selectedLang, setSelectedLang] = useState('ru')
  const [selectedTheme, setSelectedTheme] = useState('dark')

  const close = () => {
    setSettingsOpen(false)
    setShowLangPicker(false)
    setShowThemePicker(false)
  }

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

  const handleLogout = async () => {
    await logout()
    close()
    toast.success('Вы вышли из аккаунта', {
      description: 'До встречи! 😊',
      duration: 3000,
    })
  }

  const handleLangSelect = (code: string) => {
    setSelectedLang(code)
    setShowLangPicker(false)
    if (code !== 'ru') {
      toast('Смена языка будет доступна в будущих обновлениях', {
        description: 'Пока доступен только русский',
        duration: 3000,
      })
    }
  }

  const handleThemeSelect = (code: string) => {
    if (code !== 'dark') {
      toast('Смена темы будет доступна в будущих обновлениях', {
        description: code === 'light' ? 'Светлая тема скоро появится' : 'Автоматическая тема скоро появится',
        duration: 3000,
      })
      return
    }
    setSelectedTheme(code)
    setShowThemePicker(false)
  }

  const avatarLetter = user?.username ? user.username.charAt(0).toUpperCase() : '?'
  const displayName = user?.username ?? 'Гость'
  const displayEmail = user?.username ? `${user.username}@moodlog.com` : ''

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[150] transition-all duration-300 ${
          settingsOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Side menu */}
      <div
        className={`fixed top-0 right-0 w-[280px] sm:w-[300px] h-full z-[200] flex flex-col pt-16 sm:pt-20 px-4 sm:px-6 pb-6 transition-all duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.4,1.1)] ${
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
          <div className="w-14 h-14 mx-auto mb-3.5 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Аватар" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[22px] font-medium rounded-full">
                {avatarLetter}
              </div>
            )}
          </div>
          <div className="text-[17px] font-medium mb-1">{displayName}</div>
          <div className="text-xs text-white/40">{displayEmail}</div>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto">
          {/* Профиль */}
          <button
            type="button"
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/70 hover:text-white hover:bg-white/[0.04] bg-transparent border-none w-full text-left font-[inherit]"
            onClick={() => { close(); setActiveModal('profile') }}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Профиль</span>
          </button>

          {/* Язык */}
          <div>
            <button
              type="button"
              className="flex items-center justify-between gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/70 hover:text-white hover:bg-white/[0.04] bg-transparent border-none w-full text-left font-[inherit]"
              onClick={() => { setShowLangPicker(!showLangPicker); setShowThemePicker(false) }}
            >
              <div className="flex items-center gap-3.5">
                <Globe className="w-5 h-5" />
                <span className="text-sm font-[450] tracking-[0.3px]">Язык</span>
              </div>
              <span className="text-xs text-white/40">
                {LANGUAGES.find(l => l.code === selectedLang)?.label}
              </span>
            </button>

            {/* Language picker dropdown */}
            {showLangPicker && (
              <div className="ml-12 mr-3 mb-2 border border-white/[0.08] bg-white/[0.03]">
                {LANGUAGES.map((lang) => (
                  <button
                    type="button"
                    key={lang.code}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm bg-transparent border-none w-full text-left font-[inherit] ${
                      selectedLang === lang.code
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    }`}
                    onClick={() => handleLangSelect(lang.code)}
                  >
                    <span>{lang.label}</span>
                    {selectedLang === lang.code && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Тема */}
          <div>
            <button
              type="button"
              className="flex items-center justify-between gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-white/70 hover:text-white hover:bg-white/[0.04] bg-transparent border-none w-full text-left font-[inherit]"
              onClick={() => { setShowThemePicker(!showThemePicker); setShowLangPicker(false) }}
            >
              <div className="flex items-center gap-3.5">
                <Palette className="w-5 h-5" />
                <span className="text-sm font-[450] tracking-[0.3px]">Тема</span>
              </div>
              <span className="text-xs text-white/40">
                {THEMES.find(t => t.code === selectedTheme)?.label}
              </span>
            </button>

            {/* Theme picker dropdown */}
            {showThemePicker && (
              <div className="ml-12 mr-3 mb-2 border border-white/[0.08] bg-white/[0.03]">
                {THEMES.map((theme) => (
                  <button
                    type="button"
                    key={theme.code}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm bg-transparent border-none w-full text-left font-[inherit] ${
                      selectedTheme === theme.code && theme.code === 'dark'
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    } ${theme.code !== 'dark' ? 'opacity-60' : ''}`}
                    onClick={() => handleThemeSelect(theme.code)}
                  >
                    <div>
                      <span>{theme.label}</span>
                      {theme.code !== 'dark' && (
                        <span className="text-[10px] text-white/30 ml-2">скоро</span>
                      )}
                    </div>
                    {selectedTheme === theme.code && theme.code === 'dark' && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* Logout item */}
        <button
          type="button"
          className="flex items-center gap-3.5 py-3.5 px-3 cursor-pointer transition-colors text-red-400/80 hover:text-red-400 hover:bg-red-500/5 pt-5 mt-5 border-t border-white/[0.08] bg-transparent border-x-0 border-b-0 w-full text-left font-[inherit]"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-[450] tracking-[0.3px]">Выйти</span>
        </button>
      </div>
    </>
  )
}
