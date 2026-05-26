export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={`bg-footer-bg border-t border-border px-5 sm:px-6 md:px-12 py-8 sm:py-10 pb-12 sm:pb-10 mt-auto ${className || ''}`}>
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs sm:text-sm text-muted-foreground text-center">
          © 2026 MoodLog — твой личный дневник настроения
        </span>
        <div className="flex items-center gap-4 text-xs sm:text-sm text-text-muted">
          <span className="cursor-pointer hover:text-foreground transition-colors py-1">
            Политика конфиденциальности
          </span>
          <span>·</span>
          <span className="cursor-pointer hover:text-foreground transition-colors py-1">
            Поддержка
          </span>
        </div>
      </div>
    </footer>
  )
}
