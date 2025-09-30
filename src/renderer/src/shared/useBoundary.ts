import { useState, useCallback } from 'react'

interface BoundaryState {
  hasError: boolean
  error: Error | null
}

export function useBoundary() {
  const [state, setState] = useState<BoundaryState>({
    hasError: false,
    error: null
  })

  const reset = useCallback(() => {
    setState({
      hasError: false,
      error: null
    })
  }, [])

  const captureError = useCallback((error: Error) => {
    setState({
      hasError: true,
      error
    })
  }, [])

  const withErrorBoundary = useCallback(<T extends any[]>(
    fn: (...args: T) => any
  ) => {
    return (...args: T) => {
      try {
        const result = fn(...args)

        // Handle async functions
        if (result && typeof result.catch === 'function') {
          return result.catch((error: Error) => {
            captureError(error)
            throw error
          })
        }

        return result
      } catch (error) {
        captureError(error as Error)
        throw error
      }
    }
  }, [captureError])

  return {
    hasError: state.hasError,
    error: state.error,
    reset,
    captureError,
    withErrorBoundary
  }
}
