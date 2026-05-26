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
const FETCH_MAX_RETRIES = 2
const FETCH_BASE_DELAY = 500
const FETCH_TIMEOUT_MS = 10000 // 10s timeout — prevents page freeze

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
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = FETCH_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      // On 401 — try to refresh session once before giving up
      if (response.status === 401 && attempt === 0) {
        const refreshed = await tryRefreshSession()
        if (refreshed) {
          // Retry with fresh headers (token might still be valid, DB was just slow)
          const newHeaders = { ...options.headers }
          const token = loadToken()
          if (token) {
            (newHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
          }
          const retryRes = await fetchWithTimeout(url, { ...options, headers: newHeaders })
          if (retryRes.ok || retryRes.status < 500) {
            return retryRes
          }
        }
        // Session truly invalid — don't retry, let caller handle 401
        return response
      }

      // Retry on server errors (500, 502, 503, 504)
      if (response.status >= 500 && attempt < retries) {
        const delay = Math.min(
          FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 300,
          3000
        )
        console.warn(
          `[fetch] Server error ${response.status}, retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If aborted (timeout), don't retry — return a synthetic error response
      if (lastError.name === 'AbortError') {
        console.warn(`[fetch] Request to ${url} timed out after ${FETCH_TIMEOUT_MS}ms`)
        return new Response(JSON.stringify({ success: false, message: 'Превышено время ожидания. Проверьте соединение.' }), {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (attempt < retries) {
        const delay = Math.min(
          FETCH_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 300,
          3000
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
  setEntries: (entries) => set({ entries }),
  fetchEntries: async (month) => {
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetchWithRetry(`/api/entries${params}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        set({ entries: data.entries ?? data, isOffline: false })
      } else if (res.status === 401) {
        // Token truly expired after refresh attempt
        clearToken()
        set({ user: null, isAuthenticated: false, entries: [] })
      }
    } catch (e) {
      console.error('Failed to fetch entries:', e)
      set({ isOffline: true })
    }
  },
  addEntry: async (data) => {
    try {
      const res = await fetchWithRetry('/api/entries', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        const entry = result.entry ?? result
        set((s) => ({ entries: [entry, ...s.entries], isOffline: false }))
        // Refresh stats for the currently viewed month
        const currentMonth = get().calendarMonth
        get().fetchStats(currentMonth)
        get().fetchEntries(currentMonth)
        return true
      }
      if (res.status === 401) {
        clearToken()
        set({ user: null, isAuthenticated: false })
        toast.error('Сессия истекла. Войдите заново.')
      } else if (res.status === 409) {
        toast.error('Запись за эту дату уже существует')
      } else if (res.status === 504) {
        toast.error('Превышено время ожидания. Проверьте соединение.')
      } else {
        toast.error('Не удалось сохранить запись')
      }
      return false
    } catch {
      set({ isOffline: true })
      toast.error('Нет связи с сервером')
      return false
    }
  },
  updateEntry: async (id, data) => {
    try {
      const res = await fetchWithRetry(`/api/entries/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        const updated = result.entry ?? result
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...updated } : e)),
          isOffline: false,
        }))
        // Refresh stats for the currently viewed month
        const currentMonth = get().calendarMonth
        get().fetchStats(currentMonth)
        get().fetchEntries(currentMonth)
        return true
      }
      return false
    } catch {
      set({ isOffline: true })
      return false
    }
  },
  deleteEntry: async (id) => {
    try {
      const res = await fetchWithRetry(`/api/entries/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
          activeModal: null,
          selectedEntry: null,
          isOffline: false,
        }))
        // Refresh stats for the currently viewed month
        const currentMonth = get().calendarMonth
        get().fetchStats(currentMonth)
        get().fetchEntries(currentMonth)
        return true
      }
      return false
    } catch {
      set({ isOffline: true })
      return false
    }
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
