'use client'

import { create } from 'zustand'
import { toast } from 'sonner'

export interface MoodEntry {
  id: string
  date: string
  moodScore: number
  moodLabel: string
  notes: string | null
  sleepHours: number | null
  activityLevel: number | null
  stressLevel: number | null
  goodThing: string | null
  badThing: string | null
  createdAt: string
  userId: string
}

export interface Stats {
  totalEntries: number
  avgMood: number
  bestDay: string | null
  worstDay: string | null
  currentStreak: number
  longestStreak: number
  moodDistribution: Record<string, number>
  trend: 'up' | 'down' | 'stable'
  avgSleep: number | null
  mostFrequentMood: string | null
}

export type ModalType = 'add' | 'edit' | 'view' | 'login' | 'register' | 'delete' | 'profile' | 'forgot-password' | 'share-stats' | null

export type MainTab = 'calendar' | 'stats'

// ─── Token helpers (localStorage) ─── //
const TOKEN_KEY = 'moodlog_token'

function saveToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* noop */ }
}

function loadToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
}

/**
 * Get Authorization headers for API fetch calls.
 * Always includes Content-Type: application/json and, if a token exists, Authorization: Bearer.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = loadToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// ─── Fetch with retry + auto-session-refresh + timeout ─── //
const FETCH_MAX_RETRIES = 4      // More retries for resilience
const FETCH_BASE_DELAY = 600
const FETCH_TIMEOUT_MS = 15000   // 15s timeout — slower connections need more time

/**
 * Fetch with AbortController timeout — rejects if server doesn't respond in time.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Try to refresh the session by re-checking /api/auth/session.
 * Returns true if session is still valid, false if not.
 */
async function tryRefreshSession(): Promise<boolean> {
  try {
    const token = loadToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetchWithTimeout('/api/auth/session', { headers }, 5000)
    if (res.ok) {
      const data = await res.json()
      if (data.authenticated && data.user) {
        // Session still valid — update user in store
        useAppStore.getState().setUser(data.user)
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Fetch with automatic retry on network errors, 5xx responses,
 * AND auto-session-refresh on 401.
 * Includes AbortController timeout to prevent page freeze.
 * Retries aggressively — user sees a loading spinner, not errors.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = FETCH_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null
  let sessionRefreshAttempted = false

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      // On 401 — try to refresh session (only once across all attempts)
      if (response.status === 401 && !sessionRefreshAttempted) {
        sessionRefreshAttempted = true
        const refreshed = await tryRefreshSession()
        if (refreshed) {
          // Retry with fresh headers
          const newHeaders = { ...options.headers }
          const token = loadToken()
          if (token) {
            (newHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
          }
          const retryRes = await fetchWithTimeout(url, { ...options, headers: newHeaders })
          if (retryRes.ok || retryRes.status < 500) {
            return retryRes
          }
          // Even after refresh, got another error — continue retrying
        }
        // Session truly invalid — return 401 so caller can handle
        if (!refreshed) return response
      }

      // On 401 after session refresh already attempted — don't retry, return
      if (response.status === 401 && sessionRefreshAttempted) {
        return response
      }

      // Retry on server errors (500, 502, 503, 504) and 429 (rate limit)
      if ((response.status >= 500 || response.status === 429) && attempt < retries) {
        const delay = Math.min(
          FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500,
          5000
        )
        console.warn(
          `[fetch] Server error ${response.status}, retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // On timeout (504), also retry — the server might just be slow
      if (response.status === 504 && attempt < retries) {
        const delay = Math.min(
          FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500,
          5000
        )
        console.warn(
          `[fetch] Timeout 504, retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If aborted (timeout), retry with longer timeout — server may be slow
      if (lastError.name === 'AbortError') {
        if (attempt < retries) {
          const delay = Math.min(
            FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500,
            5000
          )
          console.warn(
            `[fetch] Timeout on ${url}, retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        // All retries exhausted for timeout
        return new Response(JSON.stringify({ success: false, message: 'Превышено время ожидания. Проверьте соединение.' }), {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (attempt < retries) {
        const delay = Math.min(
          FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500,
          5000
        )
        console.warn(
          `[fetch] Network error, retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms...`,
          lastError.message
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Execute an async operation with automatic retry until success or max attempts.
 * Returns true on success, false on exhausted retries.
 * Shows a warning toast only after many failures — not on every transient error.
 */
async function retryUntilSuccess<T>(
  fn: () => Promise<T>,
  isSuccess: (result: T) => boolean,
  maxAttempts: number = 6,
  baseDelay: number = 800
): Promise<T | null> {
  let lastResult: T | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      lastResult = await fn()
      if (isSuccess(lastResult)) {
        return lastResult
      }
    } catch (error) {
      lastError = error
    }

    // Wait before retrying with exponential backoff
    const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 400, 6000)
    console.warn(`[retryUntilSuccess] Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms...`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // All attempts exhausted
  if (lastError) throw lastError
  return lastResult
}

interface AppState {
  // Auth
  user: { id: string; username: string; avatarUrl?: string | null } | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  setUser: (user: { id: string; username: string; avatarUrl?: string | null } | null) => void
  setAuthLoading: (loading: boolean) => void
  logout: () => Promise<void>

  // Entries
  entries: MoodEntry[]
  entriesLoading: boolean
  setEntries: (entries: MoodEntry[]) => void
  fetchEntries: (month?: string) => Promise<void>
  addEntry: (data: Omit<MoodEntry, 'id' | 'createdAt' | 'userId'>) => Promise<boolean>
  updateEntry: (id: string, data: Partial<MoodEntry>) => Promise<boolean>
  deleteEntry: (id: string) => Promise<boolean>

  // Stats
  stats: Stats | null
  fetchStats: (month?: string) => Promise<void>

  // UI
  activeModal: ModalType
  setActiveModal: (modal: ModalType) => void
  selectedEntry: MoodEntry | null
  setSelectedEntry: (entry: MoodEntry | null) => void
  pendingEntryDate: string | null
  setPendingEntryDate: (date: string | null) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  calendarMonth: string
  setCalendarMonth: (month: string) => void
  activeTab: MainTab
  setActiveTab: (tab: MainTab) => void

  // Network status
  isOffline: boolean
  setOffline: (offline: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isAuthLoading: false }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  logout: async () => {
    try {
      await fetchWithRetry('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      })
    } catch { /* noop */ }
    clearToken()
    set({ user: null, isAuthenticated: false, entries: [], stats: null })
  },

  // Entries
  entries: [],
  entriesLoading: false,
  setEntries: (entries) => set({ entries }),
  fetchEntries: async (month) => {
    set({ entriesLoading: true })
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetchWithRetry(`/api/entries${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        set({ entries: data.entries ?? data, isOffline: false, entriesLoading: false })
      } else if (res.status === 401) {
        // Token truly expired after refresh attempt
        clearToken()
        set({ user: null, isAuthenticated: false, entries: [], entriesLoading: false })
      } else {
        set({ entriesLoading: false })
      }
    } catch (e) {
      console.error('Failed to fetch entries:', e)
      set({ isOffline: true, entriesLoading: false })
    }
  },
  addEntry: async (data) => {
    // Use retryUntilSuccess — keeps trying while user sees loading spinner
    const result = await retryUntilSuccess(
      async () => {
        const res = await fetchWithRetry('/api/entries', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        })
        return res
      },
      (res) => {
        // Success if 200-299
        if (res.ok) return true
        // Don't retry on 401 (session invalid) or 409 (duplicate) — these are permanent
        if (res.status === 401 || res.status === 409) return true
        // Retry on everything else (5xx, network, timeout)
        return false
      },
      6,  // up to 6 attempts total
      800
    )

    if (!result) {
      toast.error('Не удалось сохранить запись. Попробуйте позже.')
      return false
    }

    if (result.status === 401) {
      clearToken()
      set({ user: null, isAuthenticated: false })
      toast.error('Сессия истекла. Войдите заново.')
      return false
    }

    if (result.status === 409) {
      toast.error('Запись за эту дату уже существует')
      return false
    }

    if (result.ok) {
      const resData = await result.json()
      const entry = resData.entry ?? resData
      set((s) => ({ entries: [entry, ...s.entries], isOffline: false }))
      const currentMonth = get().calendarMonth
      get().fetchStats(currentMonth)
      get().fetchEntries(currentMonth)
      return true
    }

    toast.error('Не удалось сохранить запись. Попробуйте позже.')
    return false
  },
  updateEntry: async (id, data) => {
    const result = await retryUntilSuccess(
      async () => {
        const res = await fetchWithRetry(`/api/entries/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        })
        return res
      },
      (res) => {
        if (res.ok) return true
        if (res.status === 401) return true // permanent, don't retry
        return false // retry on everything else
      },
      6,
      800
    )

    if (!result) {
      toast.error('Не удалось сохранить изменения.')
      return false
    }

    if (result.status === 401) {
      clearToken()
      set({ user: null, isAuthenticated: false })
      toast.error('Сессия истекла. Войдите заново.')
      return false
    }

    if (result.ok) {
      const resData = await result.json()
      const updated = resData.entry ?? resData
      set((s) => ({
        entries: s.entries.map((e) => (e.id === id ? { ...e, ...updated } : e)),
        isOffline: false,
      }))
      const currentMonth = get().calendarMonth
      get().fetchStats(currentMonth)
      get().fetchEntries(currentMonth)
      return true
    }

    toast.error('Не удалось сохранить изменения.')
    return false
  },
  deleteEntry: async (id) => {
    const result = await retryUntilSuccess(
      async () => {
        const res = await fetchWithRetry(`/api/entries/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        return res
      },
      (res) => {
        if (res.ok) return true
        if (res.status === 401) return true // permanent, don't retry
        return false
      },
      6,
      800
    )

    if (!result) {
      toast.error('Не удалось удалить запись.')
      return false
    }

    if (result.status === 401) {
      clearToken()
      set({ user: null, isAuthenticated: false })
      toast.error('Сессия истекла. Войдите заново.')
      return false
    }

    if (result.ok) {
      set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
        activeModal: null,
        selectedEntry: null,
        isOffline: false,
      }))
      const currentMonth = get().calendarMonth
      get().fetchStats(currentMonth)
      get().fetchEntries(currentMonth)
      return true
    }

    toast.error('Не удалось удалить запись.')
    return false
  },

  // Stats
  stats: null,
  fetchStats: async (month) => {
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetchWithRetry(`/api/stats${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        set({ stats: data, isOffline: false })
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
      set({ isOffline: true })
    }
  },

  // UI
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  selectedEntry: null,
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  pendingEntryDate: null,
  setPendingEntryDate: (date) => set({ pendingEntryDate: date }),
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  calendarMonth: new Date().toISOString().slice(0, 7),
  setCalendarMonth: (month) => set({ calendarMonth: month }),
  activeTab: 'calendar',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Network status
  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),
}))

// Re-export token helpers for use in components
export { saveToken, loadToken, clearToken }
