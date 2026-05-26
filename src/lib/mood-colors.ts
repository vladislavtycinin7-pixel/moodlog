/**
 * Unified mood color system for MoodLog.
 * Single source of truth — all components import from here.
 */

export const MOOD_LABELS = [
  'Отличное',
  'Хорошее',
  'Нейтральное',
  'Уставшее',
  'Тревожное',
  'Раздраженное',
  'Грустное',
] as const

export type MoodLabel = (typeof MOOD_LABELS)[number]

interface MoodColorDef {
  hex: string        // e.g. '#a855f7'
  bg: string         // Tailwind bg class, e.g. 'bg-purple-500'
  shadow: string     // Tailwind shadow class for glow effect
  shadowRgba: string // CSS rgba for inline shadow styles
}

const MOOD_COLOR_MAP: Record<MoodLabel, MoodColorDef> = {
  'Отличное': {
    hex: '#a855f7',
    bg: 'bg-purple-500',
    shadow: 'shadow-[0_0_4px_rgba(168,85,247,0.6)]',
    shadowRgba: 'rgba(168,85,247,0.6)',
  },
  'Хорошее': {
    hex: '#10b981',
    bg: 'bg-emerald-500',
    shadow: 'shadow-[0_0_4px_rgba(16,185,129,0.6)]',
    shadowRgba: 'rgba(16,185,129,0.6)',
  },
  'Нейтральное': {
    hex: '#6b7280',
    bg: 'bg-gray-500',
    shadow: 'shadow-[0_0_4px_rgba(107,114,128,0.6)]',
    shadowRgba: 'rgba(107,114,128,0.6)',
  },
  'Грустное': {
    hex: '#3b82f6',
    bg: 'bg-blue-500',
    shadow: 'shadow-[0_0_4px_rgba(59,130,246,0.6)]',
    shadowRgba: 'rgba(59,130,246,0.6)',
  },
  'Тревожное': {
    hex: '#f59e0b',
    bg: 'bg-amber-500',
    shadow: 'shadow-[0_0_4px_rgba(245,158,11,0.6)]',
    shadowRgba: 'rgba(245,158,11,0.6)',
  },
  'Раздраженное': {
    hex: '#ef4444',
    bg: 'bg-red-500',
    shadow: 'shadow-[0_0_4px_rgba(239,68,68,0.6)]',
    shadowRgba: 'rgba(239,68,68,0.6)',
  },
  'Уставшее': {
    hex: '#06b6d4',
    bg: 'bg-cyan-500',
    shadow: 'shadow-[0_0_4px_rgba(6,182,212,0.6)]',
    shadowRgba: 'rgba(6,182,212,0.6)',
  },
}

/**
 * Get hex color for a mood label (for inline styles / recharts).
 */
export function getMoodColor(label: string): string {
  return (MOOD_COLOR_MAP as Record<string, MoodColorDef>)[label]?.hex ?? '#a855f7'
}

/**
 * Get full color definition for a mood label (for calendar dots, etc.).
 */
export function getMoodColorDef(label: string): MoodColorDef {
  return (MOOD_COLOR_MAP as Record<string, MoodColorDef>)[label] ?? MOOD_COLOR_MAP['Отличное']
}

/**
 * Derive mood label from score (1-10).
 * Used when creating a new entry — slider value → label.
 */
export function scoreToLabel(score: number): MoodLabel {
  if (score >= 8) return 'Отличное'
  if (score >= 6) return 'Хорошее'
  if (score === 5) return 'Нейтральное'
  if (score >= 3) return 'Грустное'
  if (score === 2) return 'Тревожное'
  return 'Уставшее'
}
