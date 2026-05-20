'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAppStore, saveToken } from '@/lib/store'

export default function AuthModals() {
  const { activeModal, setActiveModal, setUser } = useAppStore()

  const isOpen = activeModal === 'login' || activeModal === 'register'

  // ─── Login state ───
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginShowPw, setLoginShowPw] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // ─── Register state ───
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regShowPw, setRegShowPw] = useState(false)
  const [regShowConfirm, setRegShowConfirm] = useState(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // ─── Reset form state when modal changes ───
  useEffect(() => {
    if (activeModal === 'login') {
      setLoginUsername('')
      setLoginPassword('')
      setLoginShowPw(false)
      setLoginError('')
      setLoginLoading(false)
    } else if (activeModal === 'register') {
      setRegUsername('')
      setRegPassword('')
      setRegConfirm('')
      setRegShowPw(false)
      setRegShowConfirm(false)
      setRegError('')
      setRegLoading(false)
    }
  }, [activeModal])

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

  // ─── Login submit ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Введите имя пользователя и пароль')
      return
    }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        // Store token in localStorage for subsequent API calls
        if (data.token) {
          saveToken(data.token)
        }
        setUser(data.user)
        setActiveModal(null)
      } else {
        setLoginError(data.message || 'Ошибка при входе')
      }
    } catch {
      setLoginError('Ошибка соединения')
    } finally {
      setLoginLoading(false)
    }
  }

  // ─── Register submit ───
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')

    if (!regUsername.trim() || !regPassword || !regConfirm) {
      setRegError('Заполните все поля')
      return
    }

    if (regPassword !== regConfirm) {
      setRegError('Пароли не совпадают')
      return
    }

    setRegLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          confirmPassword: regConfirm,
        }),
      })
      const data = await res.json()

      if (data.success && data.user) {
        // Store token in localStorage for subsequent API calls
        if (data.token) {
          saveToken(data.token)
        }
        setUser(data.user)
        setActiveModal(null)
      } else {
        setRegError(data.message || 'Ошибка при регистрации')
      }
    } catch {
      setRegError('Ошибка соединения')
    } finally {
      setRegLoading(false)
    }
  }

  // ─── Overlay click ───
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setActiveModal(null)
    }
  }

  // ─── Switch modal ───
  const switchToRegister = () => setActiveModal('register')
  const switchToLogin = () => setActiveModal('login')

  return (
    <>
      {/* ═══════ LOGIN MODAL ═══════ */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-[6px] z-[200] flex justify-center items-center transition-[visibility,opacity] duration-300 ease ${
          activeModal === 'login' ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
        aria-label="Вход"
      >
        <div
          className={`relative w-full max-w-[420px] bg-[rgba(18,18,24,0.98)] border border-white/[0.1] rounded-xl p-6 sm:p-10 mx-4 transition-transform duration-200 ease ${
            activeModal === 'login' ? 'scale-100' : 'scale-95'
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
          <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white">
            Вход
          </h2>
          <p className="text-[13px] text-white/50 mb-8">Войдите в свой аккаунт</p>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                className="w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                placeholder="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={loginShowPw ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setLoginShowPw(!loginShowPw)}
                  aria-label={loginShowPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {loginShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <p className="text-red-400 text-xs mb-4">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
            >
              {loginLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-white/[0.08] text-[13px] text-white/50">
            Нет аккаунта?{' '}
            <span
              className="text-purple-500 cursor-pointer hover:underline"
              onClick={switchToRegister}
              role="button"
            >
              Зарегистрируйтесь
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ REGISTER MODAL ═══════ */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-[6px] z-[200] flex justify-center items-center transition-[visibility,opacity] duration-300 ease ${
          activeModal === 'register' ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
        aria-label="Регистрация"
      >
        <div
          className={`relative w-full max-w-[420px] bg-[rgba(18,18,24,0.98)] border border-white/[0.1] rounded-xl p-6 sm:p-10 mx-4 transition-transform duration-200 ease ${
            activeModal === 'register' ? 'scale-100' : 'scale-95'
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
          <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white">
            Регистрация
          </h2>
          <p className="text-[13px] text-white/50 mb-8">
            Создайте аккаунт, чтобы начать
          </p>

          {/* Form */}
          <form onSubmit={handleRegister}>
            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                className="w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                placeholder="username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={regShowPw ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setRegShowPw(!regShowPw)}
                  aria-label={regShowPw ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {regShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-white/60 mb-2">
                Подтвердить пароль
              </label>
              <div className="relative">
                <input
                  type={regShowConfirm ? 'text' : 'password'}
                  className="w-full py-3 pr-10 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30"
                  placeholder="••••••••"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                  onClick={() => setRegShowConfirm(!regShowConfirm)}
                  aria-label={regShowConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {regShowConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {regError && (
              <p className="text-red-400 text-xs mb-4">{regError}</p>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
            >
              {regLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-white/[0.08] text-[13px] text-white/50">
            Уже есть аккаунт?{' '}
            <span
              className="text-purple-500 cursor-pointer hover:underline"
              onClick={switchToLogin}
              role="button"
            >
              Войдите
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
