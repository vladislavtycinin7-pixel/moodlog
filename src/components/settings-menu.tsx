'use client'

import { useEffect, useState } from 'react'
import { User, Palette, LogOut, X, Globe, Check, Share2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

const THEMES = [
  { code: 'dark', label: 'Тёмная' },
  { code: 'light', label: 'Светлая' },
  { code: 'system', label: 'Авто' },
]

export default function SettingsMenu() {
  const { settingsOpen, setSettingsOpen, user, logout, setActiveModal } = useAppStore()
  const { theme, setTheme } = useTheme()

  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [selectedLang, setSelectedLang] = useState('ru')

  // Use theme from next-themes as source of truth (defaults to 'system' during SSR)
  const selectedTheme = theme ?? 'system'

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
    setTheme(code)
    setShowThemePicker(false)
  }

  const avatarLetter = user?.username ? user.username.charAt(0).toUpperCase() : '?'
  const displayName = user?.username ?? 'Гость'
  const displayEmail = user?.username ? `${user.username}@moodlog.com` : ''

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 backdrop-blur-[4px] z-[150] transition-all duration-300 ${
          settingsOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        style={{ background: 'var(--overlay-bg)' }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Side menu */}
      <div
        className={`fixed top-0 right-0 w-[280px] sm:w-[300px] h-full z-[200] flex flex-col pt-16 sm:pt-20 px-4 sm:px-6 pb-6 transition-all duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.4,1.1)] ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        {/* Close button */}
        <button
          className="absolute top-6 right-5 text-text-muted hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
          onClick={close}
          aria-label="Close settings"
        >
          <X size={20} />
        </button>

        {/* Profile section */}
        <div className="text-center pb-7 mb-7 border-b border-border">
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
          <div className="text-xs text-text-muted">{displayEmail}</div>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto">
          {/* Профиль */}
          <button
            type="button"
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-text-secondary hover:text-foreground hover:bg-surface bg-transparent border-none w-full text-left font-[inherit]"
            onClick={() => { close(); setActiveModal('profile') }}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Профиль</span>
          </button>

          {/* Поделиться статистикой */}
          <button
            type="button"
            className="flex items-center gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-text-secondary hover:text-foreground hover:bg-surface bg-transparent border-none w-full text-left font-[inherit]"
            onClick={() => { close(); setActiveModal('share-stats') }}
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-[450] tracking-[0.3px]">Поделиться статистикой</span>
          </button>

          {/* Язык */}
          <div>
            <button
              type="button"
              className="flex items-center justify-between gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-text-secondary hover:text-foreground hover:bg-surface bg-transparent border-none w-full text-left font-[inherit]"
              onClick={() => { setShowLangPicker(!showLangPicker); setShowThemePicker(false) }}
            >
              <div className="flex items-center gap-3.5">
                <Globe className="w-5 h-5" />
                <span className="text-sm font-[450] tracking-[0.3px]">Язык</span>
              </div>
              <span className="text-xs text-text-muted">
                {LANGUAGES.find(l => l.code === selectedLang)?.label}
              </span>
            </button>

            {/* Language picker dropdown */}
            {showLangPicker && (
              <div className="ml-12 mr-3 mb-2 border border-border bg-surface">
                {LANGUAGES.map((lang) => (
                  <button
                    type="button"
                    key={lang.code}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm bg-transparent border-none w-full text-left font-[inherit] ${
                      selectedLang === lang.code
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface'
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
              className="flex items-center justify-between gap-3.5 py-3.5 px-3 mb-1 cursor-pointer transition-colors text-text-secondary hover:text-foreground hover:bg-surface bg-transparent border-none w-full text-left font-[inherit]"
              onClick={() => { setShowThemePicker(!showThemePicker); setShowLangPicker(false) }}
            >
              <div className="flex items-center gap-3.5">
                <Palette className="w-5 h-5" />
                <span className="text-sm font-[450] tracking-[0.3px]">Тема</span>
              </div>
              <span className="text-xs text-text-muted">
                {THEMES.find(t => t.code === selectedTheme)?.label}
              </span>
            </button>

            {/* Theme picker dropdown */}
            {showThemePicker && (
              <div className="ml-12 mr-3 mb-2 border border-border bg-surface">
                {THEMES.map((t) => (
                  <button
                    type="button"
                    key={t.code}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm bg-transparent border-none w-full text-left font-[inherit] ${
                      selectedTheme === t.code
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                    }`}
                    onClick={() => handleThemeSelect(t.code)}
                  >
                    <span>{t.label}</span>
                    {selectedTheme === t.code && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* Logout item */}
        <button
          type="button"
          className="flex items-center gap-3.5 py-3.5 px-3 cursor-pointer transition-colors text-red-400/80 hover:text-red-400 hover:bg-red-500/5 pt-5 mt-5 border-t border-border bg-transparent border-x-0 border-b-0 w-full text-left font-[inherit]"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-[450] tracking-[0.3px]">Выйти</span>
        </button>
      </div>
    </>
  )
}
