import { useEffect, useState } from 'react'
import { getDebugMode, onDebugModeChanged } from './ipc'

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    getDebugMode().then(setDebugMode)
    const unsubscribe = onDebugModeChanged(setDebugMode)
    return unsubscribe
  }, [])

  return debugMode
}
