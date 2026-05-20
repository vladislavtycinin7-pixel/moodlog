'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, User, ImagePlus, Lock, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

type ProfileTab = 'nickname' | 'avatar' | 'password'

const tabs: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { key: 'nickname', label: 'Никнейм', icon: <User size={16} /> },
  { key: 'avatar', label: 'Аватар', icon: <ImagePlus size={16} /> },
  { key: 'password', label: 'Пароль', icon: <Lock size={16} /> },
]

export default function ProfileModal() {
  const { activeModal, setActiveModal, user, setUser } = useAppStore()
  const isOpen = activeModal === 'profile'

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState<ProfileTab>('nickname')

  // ─── Nickname state ───
  const [username, setUsername] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)

  // ─── Avatar state ───
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  // ─── Password state ───
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // ─── Reset form when modal opens ───
  useEffect(() => {
    if (isOpen) {
      setActiveTab('nickname')
      setUsername(user?.username ?? '')
      setAvatarUrl(user?.avatarUrl ?? '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPw(false)
      setShowNewPw(false)
      setShowConfirmPw(false)
    }
  }, [isOpen, user])

  // ─── Escape key handler ───
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setActiveModal(null)
      }
    },
    [isOpen, setActiveModal]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  // ─── Lock body scroll ───
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ─── Overlay click ───
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setActiveModal(null)
    }
  }

  // ─── Update username ───
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = username.trim()

    if (trimmed.length < 2 || trimmed.length > 20) {
      toast.error('Никнейм должен быть от 2 до 20 символов')
      return
    }

    if (trimmed === user?.username) {
      toast.error('Новый никнейм совпадает с текущим')
      return
    }

    setUsernameLoading(true)
    try {
      const res = await fetch('/api/profile/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        toast.success('Никнейм обновлён')
      } else {
        toast.error(data.message || 'Ошибка при обновлении никнейма')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setUsernameLoading(false)
    }
  }

  // ─── Update avatar ───
  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (avatarUrl.trim() === (user?.avatarUrl ?? '')) {
      toast.error('Новый URL совпадает с текущим')
      return
    }

    setAvatarLoading(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: avatarUrl.trim() }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        toast.success('Аватар обновлён')
      } else {
        toast.error(data.message || 'Ошибка при обновлении аватара')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setAvatarLoading(false)
    }
  }

  // ─── Remove avatar ───
  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: '' }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        setAvatarUrl('')
        toast.success('Аватар удалён')
      } else {
        toast.error(data.message || 'Ошибка при удалении аватара')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setAvatarLoading(false)
    }
  }

  // ─── Update password ───
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Заполните все поля')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Новый пароль должен быть не менее 6 символов')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()

      if (data.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowCurrentPw(false)
        setShowNewPw(false)
        setShowConfirmPw(false)
        toast.success('Пароль обновлён')
      } else {
        toast.error(data.message || 'Ошибка при обновлении пароля')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setPasswordLoading(false)
    }
  }

  // ─── Initials for avatar fallback ───
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : '?'

  return (
    <div
      className={`fixed inset-0 bg-black/75 backdrop-blur-[6px] z-[200] flex justify-center items-center transition-[visibility,opacity] duration-300 ease ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Профиль"
    >
      <div
        className={`relative w-full max-w-[460px] bg-[rgba(18,18,24,0.98)] border border-white/[0.1] p-8 mx-4 transition-transform duration-250 ease ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Close button */}
        <span
          className="absolute top-5 right-6 text-2xl cursor-pointer text-white/50 hover:text-white transition-colors"
          onClick={() => setActiveModal(null)}
          role="button"
          aria-label="Закрыть"
        >
          &times;
        </span>

        {/* Title */}
        <h2 className="text-[24px] font-medium tracking-[-0.5px] mb-1 text-white">
          Профиль
        </h2>
        <p className="text-[13px] text-white/50 mb-6">
          Управление вашим аккаунтом
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-7 border-b border-white/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
                activeTab === tab.key
                  ? 'text-purple-400 border-purple-500'
                  : 'text-white/50 border-transparent hover:text-white/80'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════ NICKNAME TAB ═══════ */}
        {activeTab === 'nickname' && (
          <form onSubmit={handleUsernameSubmit}>
            {/* Current username display */}
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Текущий никнейм
              </label>
              <div className="py-3 text-white/80 text-[15px] border-b border-white/[0.08]">
                {user?.username ?? '—'}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Новый никнейм
              </label>
              <input
                type="text"
                className="w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                placeholder="2–20 символов"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={20}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={usernameLoading}
              className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#9333ea] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {usernameLoading && <Loader2 size={16} className="animate-spin" />}
              {usernameLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        )}

        {/* ═══════ AVATAR TAB ═══════ */}
        {activeTab === 'avatar' && (
          <form onSubmit={handleAvatarSubmit}>
            {/* Current avatar preview */}
            <div className="flex items-center gap-5 mb-6">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Аватар"
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/40"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                    const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                    if (sibling) sibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className={`w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[22px] font-medium rounded-full shrink-0 ${user?.avatarUrl ? 'hidden' : ''}`}
              >
                {initial}
              </div>
              <div>
                <div className="text-[15px] text-white/90 font-medium mb-1">
                  {user?.username ?? '—'}
                </div>
                <div className="text-[12px] text-white/45">
                  {user?.avatarUrl ? 'Аватар установлен' : 'Аватар не установлен'}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                URL аватара
              </label>
              <input
                type="url"
                className="w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Live preview */}
            {avatarUrl.trim() && (
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-white/60 mb-2">
                  Предпросмотр
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl.trim()}
                    alt="Предпросмотр аватара"
                    className="w-12 h-12 rounded-full object-cover border border-white/[0.1]"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                      const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                      if (sibling) sibling.style.display = 'flex'
                    }}
                  />
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[18px] font-medium rounded-full shrink-0 hidden"
                  >
                    {initial}
                  </div>
                  <span className="text-[12px] text-white/40">
                    Загрузка изображения...
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={avatarLoading}
                className="flex-1 py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#9333ea] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {avatarLoading && <Loader2 size={16} className="animate-spin" />}
                {avatarLoading ? 'Сохранение...' : 'Сохранить'}
              </button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  disabled={avatarLoading}
                  onClick={handleRemoveAvatar}
                  className="py-3 px-5 bg-transparent border border-white/[0.15] text-white/60 text-sm font-medium cursor-pointer transition-colors hover:text-red-400 hover:border-red-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Удалить
                </button>
              )}
            </div>
          </form>
        )}

        {/* ═══════ PASSWORD TAB ═══════ */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Текущий пароль
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  aria-label={showCurrentPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="Минимум 6 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setShowNewPw(!showNewPw)}
                  aria-label={showNewPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Подтвердите новый пароль
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  aria-label={showConfirmPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-[#9333ea] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {passwordLoading && <Loader2 size={16} className="animate-spin" />}
              {passwordLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
