import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#090d16] text-slate-100 p-6 select-none">
          <div className="max-w-xl w-full border border-rose-500/30 bg-slate-900/90 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-wide">Interface Error Intercepted</h1>
              <p className="text-sm text-slate-400">
                An unexpected runtime condition occurred in this view. The rest of the platform remains safe.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-black/60 border border-slate-800 rounded-lg p-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-40">
                <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.reload()
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Reload Application
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
