'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, User, ImagePlus, Lock, Upload, Loader2 } from 'lucide-react'
import { useAppStore, getAuthHeaders, loadToken, fetchWithRetry } from '@/lib/store'
import { ModalOverlay, CloseBtn } from '@/components/modal-overlay'
import { toast } from 'sonner'

type Tab = 'nickname' | 'avatar' | 'password'

const inputCls =
  'w-full py-3 bg-transparent border-none border-b border-border text-foreground text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-text-muted'

/**
 * Resize an image file to fit within maxDim x maxDim on the client side.
 * Returns a Blob of the resized image in the same format.
 */
function resizeImage(file: File, maxDim = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDim && height <= maxDim) {
        // No resize needed, just return original as blob
        resolve(file)
        return
      }
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        file.type || 'image/jpeg',
        0.85 // quality for lossy formats
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export default function ProfileModal() {
  const { activeModal, setActiveModal, user, setUser } = useAppStore()
  const isOpen = activeModal === 'profile'

  const [tab, setTab] = useState<Tab>('nickname')

  // ─── Nickname state ───
  const [newUsername, setNewUsername] = useState('')
  const [nickLoading, setNickLoading] = useState(false)
  const [nickError, setNickError] = useState('')

  // ─── Avatar state ───
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Password state ───
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  // ─── Reset when modal opens ───
  useEffect(() => {
    if (isOpen) {
      setTab('nickname')
      setNewUsername(user?.username || '')
      setNickError('')
      setNickLoading(false)
      setAvatarUrl(user?.avatarUrl || '')
      setAvatarError('')
      setAvatarLoading(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShowCurrentPw(false)
      setShowNewPw(false)
      setShowConfirmPw(false)
      setPwError('')
      setPwLoading(false)
    }
  }, [isOpen, user])

  // ─── Nickname submit ───
  const handleNickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNickError('')

    if (!newUsername.trim() || newUsername.trim().length < 2 || newUsername.trim().length > 20) {
      setNickError('От 2 до 20 символов')
      return
    }

    if (newUsername.trim() === user?.username) {
      setNickError('Это ваш текущий никнейм')
      return
    }

    setNickLoading(true)
    try {
      const res = await fetchWithRetry('/api/profile/username', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUsername.trim() }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        toast.success('Никнейм обновлён!')
      } else {
        setNickError(data.message || 'Ошибка')
      }
    } catch {
      setNickError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setNickLoading(false)
    }
  }

  // ─── Avatar: upload from device ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Поддерживаются только JPEG, PNG, GIF, WebP')
      return
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Файл слишком большой (максимум 5MB)')
      return
    }

    setAvatarError('')
    setAvatarLoading(true)

    try {
      // Resize on client side
      const resizedBlob = await resizeImage(file, 512)
      const resizedFile = new File([resizedBlob], file.name, { type: file.type })

      // Upload via multipart form data
      const formData = new FormData()
      formData.append('avatar', resizedFile)

      const token = loadToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      // Don't set Content-Type for FormData — browser sets it with boundary

      const res = await fetchWithRetry('/api/upload/avatars', {
        method: 'POST',
        headers,
        body: formData,
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        setAvatarUrl(data.avatarUrl || '')
        toast.success('Аватар загружен!')
      } else {
        setAvatarError(data.message || 'Ошибка при загрузке')
      }
    } catch {
      setAvatarError('Ошибка при загрузке. Попробуйте снова.')
    } finally {
      setAvatarLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Avatar: save URL ───
  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAvatarError('')
    setAvatarLoading(true)

    try {
      const res = await fetchWithRetry('/api/profile/avatar', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ avatarUrl: avatarUrl.trim() || null }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        toast.success('Аватар обновлён!')
      } else {
        setAvatarError(data.message || 'Ошибка')
      }
    } catch {
      setAvatarError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setAvatarLoading(false)
    }
  }

  // ─── Remove avatar ───
  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    try {
      const res = await fetchWithRetry('/api/profile/avatar', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ avatarUrl: null }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        setAvatarUrl('')
        toast.success('Аватар удалён')
      }
    } catch {
      toast.error('Не удалось удалить аватар')
    } finally {
      setAvatarLoading(false)
    }
  }

  // ─── Password submit ───
  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')

    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Заполните все поля')
      return
    }
    if (newPw.length < 6) {
      setPwError('Новый пароль — минимум 6 символов')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Пароли не совпадают')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetchWithRetry('/api/profile/password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Пароль изменён!')
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
      } else {
        setPwError(data.message || 'Ошибка')
      }
    } catch {
      setPwError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setPwLoading(false)
    }
  }

  const avatarLetter = user?.username ? user.username.charAt(0).toUpperCase() : '?'

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'nickname', label: 'Никнейм', icon: <User size={16} /> },
    { key: 'avatar', label: 'Аватар', icon: <ImagePlus size={16} /> },
    { key: 'password', label: 'Пароль', icon: <Lock size={16} /> },
  ]

  return (
    <ModalOverlay open={isOpen} onClose={() => setActiveModal(null)} maxWidth="max-w-[480px]">
      <CloseBtn onClick={() => setActiveModal(null)} />

      {/* Profile header */}
        <div className="p-4 sm:p-6 md:p-8 pb-4 sm:pb-6 text-center border-b border-border">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Аватар"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[24px] font-medium rounded-full">
                {avatarLetter}
              </div>
            )}
          </div>
          <h2 className="text-[22px] font-medium tracking-[-0.5px] text-foreground">
            Профиль
          </h2>
          <p className="text-[13px] text-text-muted mt-1">{user?.username}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium cursor-pointer transition-colors border-none bg-transparent ${
                tab === t.key
                  ? 'text-purple-400 border-b-2 border-b-purple-400'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              style={tab === t.key ? { borderBottom: '2px solid #a855f7' } : {}}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6 md:p-8">
          {/* ═══ NICKNAME TAB ═══ */}
          {tab === 'nickname' && (
            <form onSubmit={handleNickSubmit}>
              <label className="label-sm">
                Никнейм
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={inputCls}
                placeholder="Новый никнейм"
                minLength={2}
                maxLength={20}
              />
              <p className="text-[11px] text-text-muted mt-2">От 2 до 20 символов</p>

              {nickError && (
                <div className="flex items-center gap-3 p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-xs flex-1">{nickError}</span>
                  <button
                    type="submit"
                    disabled={nickLoading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium cursor-pointer hover:bg-red-500/30 transition-colors rounded-md"
                  >
                    <Loader2 size={10} className={nickLoading ? 'animate-spin' : ''} />
                    Ещё раз
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={nickLoading}
                className="w-full py-3 bg-purple-500 border-none text-foreground text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg mt-6"
              >
                {nickLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Сохранение
                  </span>
                ) : 'Сохранить никнейм'}
              </button>
            </form>
          )}

          {/* ═══ AVATAR TAB ═══ */}
          {tab === 'avatar' && (
            <div>
              {/* Preview */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 shrink-0 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Аватар"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[20px] font-medium rounded-full">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Текущий аватар</p>
                  <p className="text-[11px] text-text-muted">
                    {user?.avatarUrl ? 'Загружен' : 'Инициалы по умолчанию'}
                  </p>
                </div>
              </div>

              {/* Upload from device */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="w-full py-3.5 bg-purple-500 border-none text-foreground text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  {avatarLoading ? 'Загрузка...' : 'Загрузить с устройства'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-[11px] text-text-muted mt-2 text-center">
                  JPEG, PNG, GIF или WebP — до 5MB
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-text-muted uppercase tracking-wider">или</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* URL input */}
              <form onSubmit={handleAvatarSubmit}>
                <label className="label-sm">
                  URL аватара
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-[11px] text-text-muted mt-2">
                  Вставьте ссылку на изображение
                </p>

                {avatarError && (
                  <p className="text-red-400 text-xs mt-3">{avatarError}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={avatarLoading}
                    className="flex-1 py-3 bg-transparent border border-purple-500 text-purple-400 text-sm font-medium cursor-pointer transition-colors hover:bg-purple-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Сохранить URL
                  </button>
                  {user?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarLoading}
                      className="py-3 px-5 bg-transparent border border-border text-text-secondary text-sm cursor-pointer transition-colors hover:border-purple-400 hover:text-foreground disabled:opacity-60"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ═══ PASSWORD TAB ═══ */}
          {tab === 'password' && (
            <form onSubmit={handlePwSubmit}>
              {/* Current password */}
              <div className="mb-5">
                <label className="label-sm">
                  Текущий пароль
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-3 cursor-pointer text-text-muted hover:text-foreground transition-colors bg-transparent border-none p-0"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="mb-5">
                <label className="label-sm">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="Минимум 6 символов"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-3 cursor-pointer text-text-muted hover:text-foreground transition-colors bg-transparent border-none p-0"
                    onClick={() => setShowNewPw(!showNewPw)}
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="mb-2">
                <label className="label-sm">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-3 cursor-pointer text-text-muted hover:text-foreground transition-colors bg-transparent border-none p-0"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="mt-1 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('forgot-password')}
                  className="text-xs text-purple-400/80 hover:text-purple-400 transition-colors bg-transparent border-none cursor-pointer p-0 font-[inherit]"
                >
                  Забыл пароль?
                </button>
              </div>

              {pwError && (
                <div className="flex items-center gap-3 p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-xs flex-1">{pwError}</span>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-medium cursor-pointer hover:bg-red-500/30 transition-colors rounded-md"
                  >
                    <Loader2 size={10} className={pwLoading ? 'animate-spin' : ''} />
                    Ещё раз
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-3 bg-purple-500 border-none text-foreground text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg mt-5"
              >
                {pwLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Сохранение
                  </span>
                ) : 'Изменить пароль'}
              </button>
            </form>
          )}
        </div>
      </ModalOverlay>
  )
}
