'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAppStore, saveToken } from '@/lib/store'
import { ModalOverlay, CloseBtn } from '@/components/modal-overlay'

const inputCls =
  'w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30'

export default function AuthModals() {
  const { activeModal, setActiveModal, setUser } = useAppStore()

  const loginOpen = activeModal === 'login'
  const registerOpen = activeModal === 'register'

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
        if (data.token) saveToken(data.token)
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
        if (data.token) saveToken(data.token)
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

  const close = () => setActiveModal(null)
  const switchToRegister = () => setActiveModal('register')
  const switchToLogin = () => setActiveModal('login')

  return (
    <>
      {/* ═══════ LOGIN MODAL ═══════ */}
      <ModalOverlay open={loginOpen} onClose={close} maxWidth="max-w-[420px]">
        <CloseBtn onClick={close} />
        <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white">
          Вход
        </h2>
        <p className="text-[13px] text-white/50 mb-8">Войдите в свой аккаунт</p>

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="label-sm">Имя пользователя</label>
            <input
              type="text"
              className={inputCls}
              placeholder="username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label className="label-sm">Пароль</label>
            <div className="relative">
              <input
                type={loginShowPw ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
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

        <div className="text-center mt-8 pt-6 border-t border-white/[0.08] text-[13px] text-white/50">
          Нет аккаунта?{' '}
          <button
            type="button"
            className="text-purple-500 cursor-pointer hover:underline bg-transparent border-none p-0 font-[inherit] text-[inherit]"
            onClick={switchToRegister}
          >
            Зарегистрируйтесь
          </button>
        </div>
      </ModalOverlay>

      {/* ═══════ REGISTER MODAL ═══════ */}
      <ModalOverlay open={registerOpen} onClose={close} maxWidth="max-w-[420px]">
        <CloseBtn onClick={close} />
        <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white">
          Регистрация
        </h2>
        <p className="text-[13px] text-white/50 mb-8">
          Создайте аккаунт, чтобы начать
        </p>

        <form onSubmit={handleRegister}>
          <div className="mb-6">
            <label className="label-sm">Имя пользователя</label>
            <input
              type="text"
              className={inputCls}
              placeholder="username"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label className="label-sm">Пароль</label>
            <div className="relative">
              <input
                type={regShowPw ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
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
            <label className="label-sm">Подтвердить пароль</label>
            <div className="relative">
              <input
                type={regShowConfirm ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
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

        <div className="text-center mt-8 pt-6 border-t border-white/[0.08] text-[13px] text-white/50">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            className="text-purple-500 cursor-pointer hover:underline bg-transparent border-none p-0 font-[inherit] text-[inherit]"
            onClick={switchToLogin}
          >
            Войдите
          </button>
        </div>
      </ModalOverlay>
    </>
  )
}
