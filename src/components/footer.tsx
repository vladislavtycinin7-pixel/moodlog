export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={`bg-[#08080c] border-t border-white/[0.08] px-4 sm:px-6 md:px-12 py-8 sm:py-10 mt-auto ${className || ''}`}>
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs sm:text-sm text-white/50 text-center">
          © 2026 MoodLog — твой личный дневник настроения
        </span>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-white/30">
          <span className="cursor-pointer hover:text-white transition-colors">
            Политика конфиденциальности
          </span>
          <span>·</span>
          <span className="cursor-pointer hover:text-white transition-colors">
            Поддержка
          </span>
        </div>
      </div>
    </footer>
  )
}
