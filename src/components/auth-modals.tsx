'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, KeyRound, Mail, Loader2 } from 'lucide-react'
import { useAppStore, saveToken, fetchWithRetry } from '@/lib/store'
import { ModalOverlay, CloseBtn } from '@/components/modal-overlay'

const inputCls =
  'w-full py-3 bg-transparent border-none border-b border-white/20 text-white text-[15px] font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30'

export default function AuthModals() {
  const { activeModal, setActiveModal, setUser } = useAppStore()

  const loginOpen = activeModal === 'login'
  const registerOpen = activeModal === 'register'
  const forgotOpen = activeModal === 'forgot-password'

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

  // ─── Forgot password state ───
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request')
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotResetId, setForgotResetId] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPw, setForgotNewPw] = useState('')
  const [forgotConfirmPw, setForgotConfirmPw] = useState('')
  const [forgotShowPw, setForgotShowPw] = useState(false)
  const [forgotShowConfirmPw, setForgotShowConfirmPw] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

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
    } else if (activeModal === 'forgot-password') {
      setForgotStep('request')
      setForgotUsername('')
      setForgotResetId('')
      setForgotCode('')
      setForgotNewPw('')
      setForgotConfirmPw('')
      setForgotShowPw(false)
      setForgotShowConfirmPw(false)
      setForgotError('')
      setForgotLoading(false)
      setForgotSuccess(false)
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
      const res = await fetchWithRetry('/api/auth/login', {
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
      setLoginError('Ошибка соединения. Попробуйте снова.')
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
      const res = await fetchWithRetry('/api/auth/register', {
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
      setRegError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setRegLoading(false)
    }
  }

  // ─── Forgot password: request code ───
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')

    if (!forgotUsername.trim()) {
      setForgotError('Введите имя пользователя')
      return
    }

    setForgotLoading(true)
    try {
      const res = await fetchWithRetry('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setForgotResetId(data.resetId)
        setForgotCode(data.code) // Pre-fill the code since we show it
        setForgotStep('verify')
      } else {
        setForgotError(data.message || 'Пользователь не найден')
      }
    } catch {
      setForgotError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setForgotLoading(false)
    }
  }

  // ─── Forgot password: verify code & set new password ───
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')

    if (!forgotCode || !forgotNewPw || !forgotConfirmPw) {
      setForgotError('Заполните все поля')
      return
    }

    if (forgotNewPw !== forgotConfirmPw) {
      setForgotError('Пароли не совпадают')
      return
    }

    if (forgotNewPw.length < 6) {
      setForgotError('Пароль должен содержать минимум 6 символов')
      return
    }

    setForgotLoading(true)
    try {
      const res = await fetchWithRetry('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetId: forgotResetId,
          code: forgotCode,
          newPassword: forgotNewPw,
          confirmPassword: forgotConfirmPw,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setForgotSuccess(true)
      } else {
        setForgotError(data.message || 'Ошибка при сбросе пароля')
      }
    } catch {
      setForgotError('Ошибка соединения. Попробуйте снова.')
    } finally {
      setForgotLoading(false)
    }
  }

  const close = () => setActiveModal(null)
  const switchToRegister = () => setActiveModal('register')
  const switchToLogin = () => setActiveModal('login')
  const switchToForgot = () => setActiveModal('forgot-password')

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
            {loginLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Вход
              </span>
            ) : 'Войти'}
          </button>
        </form>

        <div className="text-center mt-6 text-[13px] text-white/50">
          <button
            type="button"
            className="text-purple-400 cursor-pointer hover:underline bg-transparent border-none p-0 font-[inherit] text-[inherit]"
            onClick={switchToForgot}
          >
            Забыли пароль?
          </button>
        </div>

        <div className="text-center mt-4 pt-4 border-t border-white/[0.08] text-[13px] text-white/50">
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
            {regLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Регистрация
              </span>
            ) : 'Зарегистрироваться'}
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

      {/* ═══════ FORGOT PASSWORD MODAL ═══════ */}
      <ModalOverlay open={forgotOpen} onClose={close} maxWidth="max-w-[420px]">
        <CloseBtn onClick={close} />

        {/* Success state */}
        {forgotSuccess ? (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white text-center">
              Пароль изменён!
            </h2>
            <p className="text-[13px] text-white/50 mb-8 text-center">
              Теперь вы можете войти с новым паролем
            </p>
            <button
              type="button"
              onClick={switchToLogin}
              className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 rounded-lg"
            >
              Войти
            </button>
          </>
        ) : forgotStep === 'request' ? (
          /* Step 1: Enter username */
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/15 flex items-center justify-center">
                <Mail className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white text-center">
              Забыли пароль?
            </h2>
            <p className="text-[13px] text-white/50 mb-8 text-center">
              Введите имя пользователя, и мы сгенерируем код для сброса пароля
            </p>

            <form onSubmit={handleForgotRequest}>
              <div className="mb-6">
                <label className="label-sm">Имя пользователя</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              {forgotError && (
                <p className="text-red-400 text-xs mb-4">{forgotError}</p>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
              >
                {forgotLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Генерация кода
                  </span>
                ) : 'Получить код сброса'}
              </button>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-white/[0.08] text-[13px] text-white/50">
              Вспомнили пароль?{' '}
              <button
                type="button"
                className="text-purple-500 cursor-pointer hover:underline bg-transparent border-none p-0 font-[inherit] text-[inherit]"
                onClick={switchToLogin}
              >
                Войти
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Enter code + new password */
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/15 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <h2 className="text-[26px] font-medium tracking-[-0.5px] mb-2 text-white text-center">
              Сброс пароля
            </h2>
            <p className="text-[13px] text-white/50 mb-2 text-center">
              Ваш код сброса:
            </p>
            <div className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-4 py-3 text-center mb-6">
              <span className="text-2xl font-mono font-bold text-purple-400 tracking-[0.3em]">
                {forgotCode}
              </span>
            </div>
            <p className="text-[11px] text-white/30 mb-6 text-center">
              Код действителен 15 минут. Введите его ниже и задайте новый пароль.
            </p>

            <form onSubmit={handleForgotVerify}>
              <div className="mb-5">
                <label className="label-sm">Код сброса</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="000000"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              <div className="mb-5">
                <label className="label-sm">Новый пароль</label>
                <div className="relative">
                  <input
                    type={forgotShowPw ? 'text' : 'password'}
                    className={`${inputCls} pr-10`}
                    placeholder="Минимум 6 символов"
                    value={forgotNewPw}
                    onChange={(e) => setForgotNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                    onClick={() => setForgotShowPw(!forgotShowPw)}
                    aria-label={forgotShowPw ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {forgotShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="label-sm">Подтвердить новый пароль</label>
                <div className="relative">
                  <input
                    type={forgotShowConfirmPw ? 'text' : 'password'}
                    className={`${inputCls} pr-10`}
                    placeholder="Повторите пароль"
                    value={forgotConfirmPw}
                    onChange={(e) => setForgotConfirmPw(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-3 cursor-pointer text-white/40 hover:text-white transition-colors bg-transparent border-none p-0"
                    onClick={() => setForgotShowConfirmPw(!forgotShowConfirmPw)}
                    aria-label={forgotShowConfirmPw ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {forgotShowConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {forgotError && (
                <p className="text-red-400 text-xs mb-4">{forgotError}</p>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 bg-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
              >
                {forgotLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Сохранение
                  </span>
                ) : 'Сменить пароль'}
              </button>
            </form>

            <div className="text-center mt-6 text-[13px] text-white/50">
              <button
                type="button"
                className="text-purple-400 cursor-pointer hover:underline bg-transparent border-none p-0 font-[inherit] text-[inherit]"
                onClick={() => { setForgotStep('request'); setForgotError('') }}
              >
                Запросить новый код
              </button>
            </div>
          </>
        )}
      </ModalOverlay>
    </>
  )
}
