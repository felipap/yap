import { Component, ReactNode, ComponentType } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">
              Something went wrong
            </h3>
            <p className="text-red-600 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export function withBoundary<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode,
): ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={fallback || <div>Something went wrong</div>}
        onError={(error) => {
          console.error('Component error:', error)
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
