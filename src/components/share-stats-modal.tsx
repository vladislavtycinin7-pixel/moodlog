'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore, getAuthHeaders, fetchWithRetry } from '@/lib/store'
import { ModalOverlay, CloseBtn } from '@/components/modal-overlay'
import { toast } from 'sonner'
import {
  Download,
  Copy,
  Share2,
  QrCode,
  Link2,
  Trash2,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { getMoodColor, MOOD_LABELS } from '@/lib/mood-colors'

type Tab = 'export' | 'share'

export default function ShareStatsModal() {
  const { activeModal, setActiveModal, stats, user } = useAppStore()
  const isOpen = activeModal === 'share-stats'

  const [tab, setTab] = useState<Tab>('export')
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareDeleting, setShareDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTab('export')
      setCopied(false)
    }
  }, [isOpen])

  // Generate share link
  const handleGenerateLink = async () => {
    setShareLoading(true)
    try {
      const res = await fetchWithRetry('/api/stats/share', {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        setShareToken(data.shareToken)
      } else {
        toast.error(data.message || 'Ошибка')
      }
    } catch {
      toast.error('Ошибка соединения. Попробуйте снова.')
    } finally {
      setShareLoading(false)
    }
  }

  // Revoke share link
  const handleRevokeLink = async () => {
    setShareDeleting(true)
    try {
      const res = await fetchWithRetry('/api/stats/share', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setShareToken(null)
        toast.success('Ссылка удалена')
      }
    } catch {
      toast.error('Ошибка соединения. Попробуйте снова.')
    } finally {
      setShareDeleting(false)
    }
  }

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?share=${shareToken}`
    : ''

  // ─── Download as JSON ───
  const downloadJSON = () => {
    if (!stats) return
    const data = {
      user: user?.username || 'Аноним',
      exportedAt: new Date().toISOString(),
      stats: {
        totalEntries: stats.totalEntries,
        avgMood: stats.avgMood,
        mostFrequentMood: stats.mostFrequentMood,
        trend: stats.trend,
        avgSleep: stats.avgSleep,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        moodDistribution: stats.moodDistribution,
      },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `moodlog-stats-${new Date().toISOString().slice(0, 10)}.json`)
    toast.success('JSON файл скачан')
  }

  // ─── Download as CSV ───
  const downloadCSV = () => {
    if (!stats) return
    const rows = [
      ['Показатель', 'Значение'],
      ['Пользователь', user?.username || 'Аноним'],
      ['Дата экспорта', new Date().toLocaleDateString('ru-RU')],
      ['Всего записей', String(stats.totalEntries)],
      ['Среднее настроение', String(stats.avgMood)],
      ['Частая эмоция', stats.mostFrequentMood || '—'],
      ['Тренд', stats.trend === 'up' ? '↑ Рост' : stats.trend === 'down' ? '↓ Спад' : '→ Стабильно'],
      ['Средний сон', stats.avgSleep != null ? String(stats.avgSleep) : '—'],
      ['Текущая серия', String(stats.currentStreak)],
      ['Рекорд серии', String(stats.longestStreak)],
      [],
      ['Эмоция', 'Количество'],
      ...Object.entries(stats.moodDistribution).map(([label, count]) => [label, String(count)]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `moodlog-stats-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('CSV файл скачан')
  }

  // ─── Copy formatted text ───
  const copyToClipboard = async () => {
    if (!stats) return
    const trendEmoji = stats.trend === 'up' ? '📈' : stats.trend === 'down' ? '📉' : '➡️'
    const text = [
      `📊 MoodLog — Статистика @${user?.username || 'user'}`,
      ``,
      `📝 Всего записей: ${stats.totalEntries}`,
      `⭐ Среднее настроение: ${stats.avgMood}/10`,
      `🔥 Серия дней: ${stats.currentStreak} (рекорд: ${stats.longestStreak})`,
      `${trendEmoji} Тренд: ${stats.trend === 'up' ? 'Рост' : stats.trend === 'down' ? 'Спад' : 'Стабильно'}`,
      stats.mostFrequentMood ? `💫 Частая эмоция: ${stats.mostFrequentMood}` : '',
      stats.avgSleep != null ? `😴 Средний сон: ${stats.avgSleep}ч` : '',
      ``,
      `🎭 Распределение эмоций:`,
      ...Object.entries(stats.moodDistribution).map(([label, count]) =>
        `   ${label}: ${count}`
      ),
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Скопировано в буфер')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  // ─── Native share ───
  const nativeShare = async () => {
    if (!stats || !navigator.share) return
    const trendText = stats.trend === 'up' ? '📈 Рост' : stats.trend === 'down' ? '📉 Спад' : '➡️ Стабильно'
    try {
      await navigator.share({
        title: `MoodLog — @${user?.username}`,
        text: `📊 Статистика настроения: среднее ${stats.avgMood}/10, ${stats.totalEntries} записей, ${trendText}`,
        url: shareUrl || undefined,
      })
    } catch {
      // User cancelled or not supported
    }
  }

  // ─── Copy share link ───
  const copyShareLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Ссылка скопирована')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  if (!stats) return null

  return (
    <ModalOverlay
      open={isOpen}
      onClose={() => setActiveModal(null)}
      maxWidth="max-w-[520px]"
    >
      <CloseBtn onClick={() => setActiveModal(null)} />

      <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.5px] mb-2 text-foreground">
        Статистика
      </h2>
      <p className="text-xs sm:text-[13px] text-text-muted mb-5 pb-4 border-b border-border">
        Экспорт и обмен вашей статистики
      </p>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        <button
          onClick={() => setTab('export')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-colors border-none bg-transparent ${
            tab === 'export'
              ? 'text-purple-400'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          style={tab === 'export' ? { borderBottom: '2px solid #a855f7' } : {}}
        >
          <Download size={16} />
          Экспорт
        </button>
        <button
          onClick={() => setTab('share')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium cursor-pointer transition-colors border-none bg-transparent ${
            tab === 'share'
              ? 'text-purple-400'
              : 'text-text-muted hover:text-text-secondary'
          }`}
          style={tab === 'share' ? { borderBottom: '2px solid #a855f7' } : {}}
        >
          <Share2 size={16} />
          Поделиться
        </button>
      </div>

      {/* ═══ EXPORT TAB ═══ */}
      {tab === 'export' && (
        <div className="space-y-3">
          {/* Stats preview */}
          <div className="bg-surface border border-border rounded-xl p-4 mb-4">
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <div className="text-xl font-semibold text-purple-500">{stats.totalEntries}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Записей</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-purple-500">{stats.avgMood}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Среднее</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-purple-500">{stats.currentStreak}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Серия</div>
              </div>
            </div>
            {/* Mood distribution mini */}
            {Object.keys(stats.moodDistribution).length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-border">
                {Object.entries(stats.moodDistribution).map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[11px] w-24 break-words" style={{ color: getMoodColor(label) }}>{label}</span>
                    <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / stats.totalEntries) * 100}%`,
                          backgroundColor: getMoodColor(label),
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download buttons */}
          <button
            onClick={downloadJSON}
            className="w-full flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl cursor-pointer transition-colors hover:bg-surface-elevated hover:border-purple-500/30 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
              <FileJson className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary font-medium">Скачать JSON</div>
              <div className="text-[11px] text-text-muted">Структурированные данные</div>
            </div>
            <Download className="w-4 h-4 text-text-muted" />
          </button>

          <button
            onClick={downloadCSV}
            className="w-full flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl cursor-pointer transition-colors hover:bg-surface-elevated hover:border-purple-500/30 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary font-medium">Скачать CSV</div>
              <div className="text-[11px] text-text-muted">Для таблиц и Excel</div>
            </div>
            <Download className="w-4 h-4 text-text-muted" />
          </button>

          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl cursor-pointer transition-colors hover:bg-surface-elevated hover:border-purple-500/30 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-secondary font-medium">
                {copied ? 'Скопировано!' : 'Копировать текстом'}
              </div>
              <div className="text-[11px] text-text-muted">Форматированный текст в буфер</div>
            </div>
          </button>

          {/* Native share (mobile only) */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-3 p-3.5 bg-surface border border-border rounded-xl cursor-pointer transition-colors hover:bg-surface-elevated hover:border-purple-500/30 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-text-secondary font-medium">Поделиться</div>
                <div className="text-[11px] text-text-muted">Через системное меню</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ═══ SHARE TAB ═══ */}
      {tab === 'share' && (
        <div className="space-y-4">
          {!shareToken ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/15 flex items-center justify-center">
                <QrCode className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Публичная ссылка
              </h3>
              <p className="text-xs text-text-muted mb-6 max-w-[280px] mx-auto leading-relaxed">
                Создайте ссылку, по которой любой сможет посмотреть вашу статистику настроения. Вы можете удалить её в любой момент.
              </p>
              <button
                onClick={handleGenerateLink}
                disabled={shareLoading}
                className="px-6 py-3 bg-purple-500 border-none text-foreground text-sm font-medium cursor-pointer transition-colors hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
              >
                {shareLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Создание...
                  </span>
                ) : 'Создать ссылку'}
              </button>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                <QRCodeSVG
                  value={shareUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0a0a0f"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-center text-[11px] text-text-muted">
                Отсканируйте QR-код для просмотра статистики
              </p>

              {/* Share URL */}
              <div className="bg-surface border border-border rounded-xl p-3">
                <div className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wider">
                  Ссылка на статистику
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent border-none text-sm text-text-secondary font-mono truncate p-0 outline-none"
                  />
                  <button
                    onClick={copyShareLink}
                    className="shrink-0 p-2 bg-purple-500/15 border border-purple-500/30 rounded-lg cursor-pointer transition-colors hover:bg-purple-500/25"
                    aria-label="Копировать ссылку"
                  >
                    {copied ? (
                      <span className="text-[11px] text-emerald-400">✓</span>
                    ) : (
                      <Copy className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share via native */}
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={nativeShare}
                  className="w-full py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary font-medium cursor-pointer transition-colors hover:bg-surface-elevated flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  Поделиться через...
                </button>
              )}

              {/* Revoke link */}
              <button
                onClick={handleRevokeLink}
                disabled={shareDeleting}
                className="w-full py-3 bg-red-500/5 border border-red-500/15 rounded-xl text-sm text-red-400/70 font-medium cursor-pointer transition-colors hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {shareDeleting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Удалить публичную ссылку
              </button>
            </>
          )}
        </div>
      )}
    </ModalOverlay>
  )
}

// ─── Helpers ───

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
