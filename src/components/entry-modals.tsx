'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { MOOD_LABELS, scoreToLabel, type MoodLabel, getMoodColor } from '@/lib/mood-colors'

// Reversed mood labels for select dropdowns: bad (left/top) → good (right/bottom)
const MOOD_LABELS_REVERSED: readonly MoodLabel[] = [...MOOD_LABELS].reverse()
import { ModalOverlay, CloseBtn } from '@/components/modal-overlay'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

function formatDateRu(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = [
    '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${d} ${months[m]} ${y}`
}

// Custom range slider 1-10
function MoodSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="py-2 pb-4">
      <label className="label-sm mb-5">
        Оценка настроения (1-10)
      </label>
      <div className="relative w-full my-4">
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-slider w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-[#2b2a33] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:border-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_#a855f7_inset] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-300
            [&::-webkit-slider-thumb]:hover:shadow-[0_0_0_8px_#a855f7_inset]
            [&::-webkit-slider-thumb]:active:shadow-[0_0_0_20px_#a855f7_inset]
            [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-[#2b2a33] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-none
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_0_4px_#a855f7_inset] [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-purple-500
          "
        />
      </div>
      <div className="mt-3 px-3">
        <div className="flex justify-between mb-1.5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="w-px h-1.5 bg-white/30" />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/50">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shared input styles
const inputCls =
  'w-full py-2.5 bg-transparent border-none border-b border-white/20 text-white text-sm font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30 placeholder:text-[13px]'

const selectCls =
  'w-full py-2.5 bg-transparent border-none border-b border-white/20 text-white text-sm font-[inherit] transition-colors focus:outline-none focus:border-purple-400 cursor-pointer [&>option]:bg-[#1a1a24]'

const textareaCls =
  'w-full py-2.5 bg-transparent border-none border-b border-white/20 text-white text-sm font-[inherit] transition-colors focus:outline-none focus:border-purple-400 placeholder:text-white/30 placeholder:text-[13px] resize-vertical min-h-[70px]'

const btnPrimary =
  'py-2.5 px-7 text-sm font-medium cursor-pointer bg-purple-500 text-white hover:bg-purple-600 transition-colors border-none rounded-lg'

const btnSecondary =
  'py-2.5 px-7 text-sm font-medium cursor-pointer bg-transparent border border-white/30 text-white/80 hover:border-white/50 hover:text-white transition-colors rounded-lg'

const btnDanger =
  'py-2.5 px-7 text-sm font-medium cursor-pointer bg-red-500 text-white hover:bg-red-600 transition-colors border-none rounded-lg'

// ═══════════════════════════════════════════
// ADD ENTRY MODAL
// Uses key={isOpen} to remount → auto-reset state
// ═══════════════════════════════════════════
function AddEntryForm() {
  const { setActiveModal, addEntry, setPendingEntryDate } = useAppStore()

  // Read pendingEntryDate at mount time (from store, not stale closure)
  const pendingDate = useAppStore.getState().pendingEntryDate
  const today = new Date().toISOString().slice(0, 10)

  const [date, setDate] = useState(pendingDate || today)
  const [moodScore, setMoodScore] = useState(5)
  // moodLabel is derived from moodScore — no separate state needed
  const moodLabel = scoreToLabel(moodScore)
  const [sleepHours, setSleepHours] = useState('')
  const [goodThing, setGoodThing] = useState('')
  const [badThing, setBadThing] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Clear pending date after using it
  useAppStore.getState().setPendingEntryDate(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await addEntry({
      date,
      moodScore,
      moodLabel,
      notes: notes || null,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      activityLevel: null,
      stressLevel: null,
      goodThing: goodThing || null,
      badThing: badThing || null,
    })

    if (success) {
      toast.success('Запись добавлена!')
      setActiveModal(null)
    } else {
      setError('Не удалось сохранить. Проверьте соединение и попробуйте снова.')
    }
    setLoading(false)
  }

  return (
    <ModalOverlay
      open={true}
      onClose={() => { setPendingEntryDate(null); setActiveModal(null) }}
      maxWidth="max-w-[800px]"
    >
      <CloseBtn onClick={() => { setPendingEntryDate(null); setActiveModal(null) }} />
      <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.5px] mb-2">Новая запись</h2>
      <p className="text-[12px] sm:text-[13px] text-white/50 mb-5 sm:mb-7 pb-3 sm:pb-4 border-b border-white/[0.1]">
        Заполните форму, чтобы сохранить настроение дня
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
          {/* Left column */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <label className="label-sm">Дата</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </div>

            <MoodSlider value={moodScore} onChange={setMoodScore} />

            <div>
              <label className="label-sm">Описание настроения</label>
              <select value={moodLabel} onChange={(e) => { /* moodLabel is derived from moodScore */ }} className={selectCls}>
                {MOOD_LABELS_REVERSED.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="label-sm">Сон (часы)</label>
              <input type="number" step="0.5" min="0" max="24" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="8" className={inputCls} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <label className="label-sm">Что хорошего случилось?</label>
              <textarea value={goodThing} onChange={(e) => setGoodThing(e.target.value)} placeholder="Позитивные моменты, достижения..." className={textareaCls} maxLength={2000} />
            </div>

            <div>
              <label className="label-sm">Что плохого случилось?</label>
              <textarea value={badThing} onChange={(e) => setBadThing(e.target.value)} placeholder="Трудности, неприятности..." className={textareaCls} maxLength={2000} />
            </div>
          </div>

          {/* Full width */}
          <div className="md:col-span-2">
            <label className="label-sm">Заметки</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Что произошло сегодня?" className={textareaCls} maxLength={2000} />
          </div>

          {/* Error message with retry */}
          {error && (
            <div className="md:col-span-2 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400 text-sm flex-1">{error}</span>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/30 transition-colors rounded-md"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Повторить
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="md:col-span-2 flex flex-wrap gap-3 pt-6 border-t border-white/[0.1]">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Сохранение...
                </span>
              ) : 'Сохранить запись'}
            </button>
            <button type="button" onClick={() => { setPendingEntryDate(null); setActiveModal(null) }} className={btnSecondary}>
              Отмена
            </button>
          </div>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════
// EDIT ENTRY MODAL (inner form re-mounts via key)
// ═══════════════════════════════════════════
function EditEntryForm({ entry, onDone }: { entry: NonNullable<useAppStore['selectedEntry']>; onDone: () => void }) {
  const { setActiveModal, updateEntry } = useAppStore()
  const [moodScore, setMoodScore] = useState(entry.moodScore)
  const moodLabel = scoreToLabel(moodScore)
  const [sleepHours, setSleepHours] = useState(entry.sleepHours?.toString() || '')
  const [goodThing, setGoodThing] = useState(entry.goodThing || '')
  const [badThing, setBadThing] = useState(entry.badThing || '')
  const [notes, setNotes] = useState(entry.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await updateEntry(entry.id, {
      moodScore,
      moodLabel,
      notes: notes || null,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      goodThing: goodThing || null,
      badThing: badThing || null,
    })

    if (success) {
      toast.success('Запись обновлена!')
      onDone()
    } else {
      setError('Не удалось сохранить изменения. Попробуйте снова.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <label className="label-sm">Дата</label>
            <input type="text" value={formatDateRu(entry.date)} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>

          <MoodSlider value={moodScore} onChange={setMoodScore} />

          <div>
            <label className="label-sm">Описание настроения</label>
            <select value={moodLabel} onChange={(e) => { /* moodLabel is derived from moodScore */ }} className={selectCls}>
              {MOOD_LABELS_REVERSED.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="label-sm">Сон (часы)</label>
            <input type="number" step="0.5" min="0" max="24" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="8" className={inputCls} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <label className="label-sm">Что хорошего случилось?</label>
            <textarea value={goodThing} onChange={(e) => setGoodThing(e.target.value)} placeholder="Позитивные моменты, достижения..." className={textareaCls} maxLength={2000} />
          </div>

          <div>
            <label className="label-sm">Что плохого случилось?</label>
            <textarea value={badThing} onChange={(e) => setBadThing(e.target.value)} placeholder="Трудности, неприятности..." className={textareaCls} maxLength={2000} />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="label-sm">Заметки</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Что произошло сегодня?" className={textareaCls} maxLength={2000} />
        </div>

        {error && (
          <div className="md:col-span-2 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-red-400 text-sm flex-1">{error}</span>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/30 transition-colors rounded-md"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Повторить
            </button>
          </div>
        )}

        <div className="md:col-span-2 flex flex-wrap gap-3 pt-6 border-t border-white/[0.1]">
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Сохранение...
              </span>
            ) : 'Сохранить изменения'}
          </button>
          <button type="button" onClick={onDone} className={btnSecondary}>
            Отмена
          </button>
        </div>
      </div>
    </form>
  )
}

function EditEntryModal() {
  const { activeModal, setActiveModal, selectedEntry } = useAppStore()
  const isOpen = activeModal === 'edit'

  return (
    <ModalOverlay
      open={isOpen}
      onClose={() => setActiveModal(null)}
      maxWidth="max-w-[800px]"
    >
      <CloseBtn onClick={() => setActiveModal(null)} />
      <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.5px] mb-2">Редактирование записи</h2>
      <p className="text-[12px] sm:text-[13px] text-white/50 mb-5 sm:mb-7 pb-3 sm:pb-4 border-b border-white/[0.1]">
        Измените данные записи от {selectedEntry ? formatDateRu(selectedEntry.date) : ''}
      </p>

      {selectedEntry && (
        <EditEntryForm
          key={selectedEntry.id}
          entry={selectedEntry}
          onDone={() => setActiveModal(null)}
        />
      )}
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════
// VIEW ENTRY MODAL
// ═══════════════════════════════════════════
function ViewEntryModal() {
  const { activeModal, setActiveModal, selectedEntry } = useAppStore()
  const isOpen = activeModal === 'view'

  if (!selectedEntry) return null

  const entry = selectedEntry

  return (
    <ModalOverlay
      open={isOpen}
      onClose={() => setActiveModal(null)}
      maxWidth="max-w-[600px]"
    >
      <CloseBtn onClick={() => setActiveModal(null)} />
      <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.5px] mb-2">Запись</h2>
      <p className="text-[12px] sm:text-[13px] text-white/50 mb-5 sm:mb-7 pb-3 sm:pb-4 border-b border-white/[0.1]">
        {formatDateRu(entry.date)}
      </p>

      <div className="mb-6">
        <div className="flex mb-5 pb-3 border-b border-white/[0.08]">
          <div className="w-24 sm:w-36 text-xs font-medium text-white/50 uppercase tracking-[0.3px] shrink-0">Настроение</div>
          <div className="flex-1 text-sm text-white/90">
            <span
              className="inline-block px-2 sm:px-3 py-1 text-[12px] sm:text-[13px]"
              style={{
                backgroundColor: `${getMoodColor(entry.moodLabel)}20`,
                borderLeft: `2px solid ${getMoodColor(entry.moodLabel)}`,
              }}
            >
              {entry.moodLabel} · {entry.moodScore}/10
            </span>
          </div>
        </div>

        <div className="flex mb-5 pb-3 border-b border-white/[0.08]">
          <div className="w-24 sm:w-36 text-xs font-medium text-white/50 uppercase tracking-[0.3px] shrink-0">Сон</div>
          <div className="flex-1 text-sm text-white/90">
            {entry.sleepHours ? `${entry.sleepHours} часов` : 'Не указано'}
          </div>
        </div>

        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-white/[0.03]">
          <div className="text-[11px] font-medium text-white/40 uppercase mb-1.5 sm:mb-2 tracking-[0.5px]">Заметки</div>
          <div className="text-xs sm:text-sm text-white/80 leading-relaxed">{entry.notes || 'Нет заметок'}</div>
        </div>

        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-white/[0.03]">
          <div className="text-[11px] font-medium text-white/40 uppercase mb-1.5 sm:mb-2 tracking-[0.5px]">Что хорошего</div>
          <div className="text-xs sm:text-sm text-white/80 leading-relaxed">{entry.goodThing || 'Не указано'}</div>
        </div>

        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-white/[0.03]">
          <div className="text-[11px] font-medium text-white/40 uppercase mb-1.5 sm:mb-2 tracking-[0.5px]">Что плохого</div>
          <div className="text-xs sm:text-sm text-white/80 leading-relaxed">{entry.badThing || 'Не указано'}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-6 border-t border-white/[0.1]">
        <button className={btnPrimary} onClick={() => setActiveModal('edit')}>Редактировать</button>
        <button className={btnDanger} onClick={() => setActiveModal('delete')}>Удалить</button>
        <button className={btnSecondary} onClick={() => setActiveModal(null)}>Закрыть</button>
      </div>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════
function DeleteEntryModal() {
  const { activeModal, setActiveModal, selectedEntry, deleteEntry } = useAppStore()
  const isOpen = activeModal === 'delete'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!selectedEntry) return
    setLoading(true)
    setError('')
    const success = await deleteEntry(selectedEntry.id)
    if (success) {
      toast.success('Запись удалена')
    } else {
      setError('Не удалось удалить. Попробуйте снова.')
    }
    setLoading(false)
  }

  return (
    <ModalOverlay
      open={isOpen}
      onClose={() => setActiveModal(null)}
      maxWidth="max-w-[420px]"
    >
      <CloseBtn onClick={() => setActiveModal(null)} />
      <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.5px] mb-2">Удалить запись?</h2>
      <p className="text-[12px] sm:text-[13px] text-white/50 mb-6 sm:mb-8">
        Это действие нельзя отменить. Запись от {selectedEntry ? formatDateRu(selectedEntry.date) : ''} будет удалена навсегда.
      </p>

      {error && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm flex-1">{error}</span>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer hover:bg-red-500/30 transition-colors rounded-md"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Повторить
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={handleDelete} disabled={loading} className={btnDanger}>
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Удаление...
            </span>
          ) : 'Удалить'}
        </button>
        <button onClick={() => setActiveModal(null)} className={btnSecondary}>
          Отмена
        </button>
      </div>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════
// EXPORT: All entry modals together
// ═══════════════════════════════════════════
export default function EntryModals() {
  const { activeModal } = useAppStore()

  return (
    <>
      {/* key forces remount when modal opens → all useState auto-reset */}
      {activeModal === 'add' && <AddEntryForm key="add" />}
      <EditEntryModal />
      <ViewEntryModal />
      <DeleteEntryModal />
    </>
  )
}
