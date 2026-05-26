'use client'

import { useEffect, useCallback } from 'react'

/**
 * Shared modal overlay — glassmorphic backdrop with ESC handler and body scroll lock.
 * Used by all modals in the app.
 */
export function ModalOverlay({
  open,
  onClose,
  maxWidth,
  children,
}: {
  open: boolean
  onClose: () => void
  maxWidth?: string
  children: React.ReactNode
}) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    },
    [open, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      className={`fixed inset-0 backdrop-blur-[6px] z-[200] flex justify-center items-center transition-[visibility,opacity] duration-300 ${
        open ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      style={{ background: 'var(--overlay-bg)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`relative w-full ${maxWidth || 'max-w-[800px]'} max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-panel-bg border border-border rounded-xl p-4 sm:p-6 md:p-10 mx-2 sm:mx-4 transition-transform duration-200 ${
          open ? 'scale-100' : 'scale-95'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Shared close button for modals.
 */
export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="absolute top-3 right-3 sm:top-5 sm:right-6 text-2xl cursor-pointer text-text-muted hover:text-foreground transition-colors bg-transparent border-none leading-none z-10"
      onClick={onClick}
      aria-label="Закрыть"
    >
      ×
    </button>
  )
}
