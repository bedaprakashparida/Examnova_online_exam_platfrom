import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <details className="text-left text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <summary className="cursor-pointer text-slate-500 mb-1">Stack trace</summary>
              <pre className="whitespace-pre-wrap break-all text-red-600 dark:text-red-400">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/login'
              }}
              className="btn-primary"
            >
              Back to Login
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
