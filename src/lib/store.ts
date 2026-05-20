'use client'

import { create } from 'zustand'

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

export type ModalType = 'add' | 'edit' | 'view' | 'login' | 'register' | 'delete' | 'profile' | null

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
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  calendarMonth: string // YYYY-MM
  setCalendarMonth: (month: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isAuthLoading: false }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, isAuthenticated: false, entries: [], stats: null })
  },

  // Entries
  entries: [],
  setEntries: (entries) => set({ entries }),
  fetchEntries: async (month) => {
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetch(`/api/entries${params}`)
      if (res.ok) {
        const data = await res.json()
        // API returns { success: true, entries: [...] }
        set({ entries: data.entries ?? data })
      }
    } catch (e) {
      console.error('Failed to fetch entries:', e)
    }
  },
  addEntry: async (data) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        // API returns { success: true, entry: {...} }
        const entry = result.entry ?? result
        set((s) => ({ entries: [entry, ...s.entries] }))
        return true
      }
      return false
    } catch {
      return false
    }
  },
  updateEntry: async (id, data) => {
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        // API returns { success: true, entry: {...} }
        const updated = result.entry ?? result
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...updated } : e)),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },
  deleteEntry: async (id) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (res.ok) {
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
          activeModal: null,
          selectedEntry: null,
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  // Stats
  stats: null,
  fetchStats: async (month) => {
    try {
      const params = month ? `?month=${month}` : ''
      const res = await fetch(`/api/stats${params}`)
      if (res.ok) {
        const data = await res.json()
        // API returns stats directly (no .success wrapper)
        set({ stats: data })
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  },

  // UI
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  selectedEntry: null,
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  calendarMonth: new Date().toISOString().slice(0, 7),
  setCalendarMonth: (month) => set({ calendarMonth: month }),
}))
