export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={`bg-[#08080c] border-t border-white/[0.08] px-6 sm:px-12 py-10 mt-auto ${className || ''}`}>
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-white/50">
          © 2026 MoodLog — твой личный дневник настроения
        </span>
        <div className="flex items-center gap-2 text-xs text-white/30">
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
