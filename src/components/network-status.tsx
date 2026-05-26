'use client'

import { useState, useEffect } from 'react'
import { isRetrying, onRetryStatusChange, useAppStore } from '@/lib/store'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * Global network status indicator.
 * Shows a subtle bar at the top when:
 * - The app is retrying failed requests (shows "Переподключение...")
 * - The app is offline (shows "Нет соединения")
 */
export default function NetworkStatus() {
  const [retrying, setRetrying] = useState(false)
  const isOffline = useAppStore((s) => s.isOffline)

  useEffect(() => {
    // Listen for changes
    const unsubscribe = onRetryStatusChange(() => {
      setRetrying(isRetrying())
    })

    return unsubscribe
  }, [])

  const showRetry = retrying && !isOffline
  const showOffline = isOffline

  if (!showRetry && !showOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div
        className={`flex items-center gap-2 px-4 py-1.5 rounded-b-lg text-xs font-medium transition-all duration-300 ${
          showOffline
            ? 'bg-red-500/90 text-white'
            : 'bg-purple-500/90 text-white'
        }`}
      >
        {showOffline ? (
          <>
            <WifiOff size={12} />
            Нет соединения
          </>
        ) : (
          <>
            <RefreshCw size={12} className="animate-spin" />
            Переподключение...
          </>
        )}
      </div>
    </div>
  )
}
