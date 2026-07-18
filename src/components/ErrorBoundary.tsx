import React, { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    Sentry.captureException(error, { extra: { errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rotc-bg text-rotc-text p-8">
          <div className="max-w-2xl mx-auto bg-rotc-card border border-red-500/30 rounded-xl p-6 space-y-4">
            <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
            <pre className="text-sm text-red-300 bg-black/30 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
            <pre className="text-xs text-rotc-textMuted bg-black/20 rounded-lg p-4 overflow-auto whitespace-pre-wrap max-h-64">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-4 py-2 bg-rotc-accent text-white rounded-lg text-sm font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
