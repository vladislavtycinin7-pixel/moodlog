'use client'

import { useAppStore } from '@/lib/store'
import { getMoodColor } from '@/lib/mood-colors'
import Footer from '@/components/footer'

// Relative bar heights (percentage of container)
const barHeights = [45, 68, 32, 82, 58, 52, 74]
const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const recentEntries = [
  { label: 'Сегодня', mood: 'Хорошее', score: '7/10' },
  { label: 'Вчера', mood: 'Нейтральное', score: '5/10' },
  { label: '2 дня назад', mood: 'Отличное', score: '9/10' },
]

const features = [
  {
    title: 'Аналитика настроений',
    description:
      'Наглядные графики и статистика помогут увидеть динамику твоего состояния.',
  },
  {
    title: 'Ежедневные записи',
    description:
      'Отмечай, что хорошего и плохого случилось за день. Веди дневник эмоций.',
  },
  {
    title: 'Календарь настроения',
    description:
      'Визуальный календарь с цветными индикаторами покажет картину месяца.',
  },
  {
    title: 'Конфиденциальность',
    description:
      'Твои записи видны только тебе. Личный дневник — значит личный.',
  },
]

export default function LandingPage() {
  const setActiveModal = useAppStore((s) => s.setActiveModal)

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden mt-[70px]">
        {/* Blurred gradient background */}
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.4),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.3),transparent_60%),radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.35),transparent_50%)] blur-[80px] z-0" />

        {/* Hero content */}
        <div className="relative z-[1] max-w-[1400px] mx-auto w-full px-4 sm:px-6 md:px-12 py-8 sm:py-10 md:py-16 flex flex-col md:flex-row items-center gap-8 sm:gap-10 md:gap-20">
          {/* Left — text */}
          <div className="relative z-[1] max-w-[540px] text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-1px] sm:tracking-[-2px] leading-[1.1] mb-4 sm:mb-6">
              Дневник
              <br />
              настроения
            </h1>
            <p className="text-base sm:text-lg text-white/60 mb-6 sm:mb-8">
              Отслеживай свои эмоции, замечай тренды и становись лучше с каждым
              днём. Просто записывай, как прошёл твой день.
            </p>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-block px-5 sm:px-6 py-2.5 text-sm font-medium border border-white/20 bg-transparent text-white/70 cursor-pointer transition-colors hover:border-white/40 hover:text-white rounded-lg"
            >
              Узнать больше
            </button>
          </div>

          {/* Right — stats panel */}
          <div className="flex-1 w-full md:w-auto bg-white/[0.03] p-4 sm:p-6 md:p-8 border border-white/[0.08] rounded-xl">
            {/* Header */}
            <div className="flex justify-between mb-4 sm:mb-6 text-[10px] sm:text-xs uppercase tracking-wider text-white/50">
              <span>Динамика настроения</span>
              <span>7 дней</span>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-2 sm:gap-3 mb-6 sm:mb-8 h-20 sm:h-24 md:h-28">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-purple-500/60 rounded-sm transition-all duration-700 hover:bg-purple-500"
                  style={{ height: `${h}%`, transitionDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            {/* Day labels */}
            <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8">
              {dayLabels.map((d) => (
                <span key={d} className="flex-1 text-center text-[10px] sm:text-xs text-white/40">
                  {d}
                </span>
              ))}
            </div>

            {/* Recent entries */}
            <div className="border-t border-white/[0.08]">
              {recentEntries.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between py-2.5 sm:py-3 border-b border-white/[0.05] text-xs sm:text-sm"
                >
                  <span className="text-white/50">{item.label}</span>
                  <span className="font-medium" style={{ color: getMoodColor(item.mood) }}>{item.mood}</span>
                  <span className="font-medium">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section
        id="features"
        className="py-16 sm:py-24 px-4 sm:px-6 md:px-12 max-w-[1400px] mx-auto border-t border-white/[0.08] scroll-mt-20"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-1px] mb-3 sm:mb-4">
          Почему MoodLog?
        </h2>
        <p className="text-white/50 mb-10 sm:mb-16 max-w-[600px] text-sm sm:text-base">
          Веди дневник эмоций, анализируй тренды и улучшай качество жизни
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {features.map((f) => (
            <div key={f.title} className="border-t-2 border-purple-500 pt-5">
              <h3 className="text-lg font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  )
}
