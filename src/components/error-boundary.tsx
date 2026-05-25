'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — catches runtime errors in child components
 * and renders a friendly error screen instead of crashing the whole app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleHardReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Что-то пошло не так</h2>
              <p className="text-white/50 text-sm">
                Произошла неожиданная ошибка. Попробуйте обновить страницу или нажать кнопку ниже.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-white/[0.03] border border-white/[0.08] rounded-lg p-3">
                <summary className="text-xs text-white/30 cursor-pointer">Детали ошибки</summary>
                <pre className="mt-2 text-xs text-red-400/80 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-white/70 hover:text-white text-sm transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                Попробовать снова
              </button>
              <button
                onClick={this.handleHardReload}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Перезагрузить
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
