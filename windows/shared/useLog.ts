import { useEffect, useState } from 'react'
import { EnrichedLog } from '../library/types'
import { getLog, onLogUpdated, removeLogUpdatedListener } from './ipc'

// export function useBackendState() {
//   const [loading, setLoading] = useState(true)
//   const [state, setState] = useState<State | null>(null)
//   const stateRef = useRef<State | null>(null)
//   const stateCount = useRef(0)
//
//   useEffect(() => {
//     async function load() {
//       setLoading(true)
//       const state = await window.electronAPI.getState()
//       stateRef.current = state
//       stateCount.current++
//       setState(state)
//       setLoading(false)
//     }
//     load()
//
//     // Subscribe to state changes
//     // const unsubscribe = window.electronAPI.onStateChange((newState) => {
//     //   stateRef.current = newState
//     //   setState(newState)
//     //   stateCount.current++
//     // })
//
//     // Cleanup subscription on unmount
//     return () => {
//       // unsubscribe()
//     }
//   }, [])
//
//   return {
//     state,
//     stateRef,
//     setPartialState,
//     loading,
//     stateCount: stateCount.current,
//   }
// }

export function useLog(logId: string | null) {
  const [log, setLog] = useState<EnrichedLog | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!logId) {
      setLog(undefined)
      return
    }
    setLoading(true)
    try {
      const fresh = await getLog(logId)
      console.log('fresh', fresh)
      setLog(fresh)
    } catch (error) {
      console.error('Failed to load log:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!logId) {
      return
    }

    // Refresh periodically as a fallback
    const intervalId = setInterval(load, 1000)

    // React to general log updated/removed events
    const handleGeneralLogEvent = (eventLogId: string) => {
      if (eventLogId === logId) {
        void load()
      }
    }
    onLogUpdated(handleGeneralLogEvent)

    return () => {
      clearInterval(intervalId)
      removeLogUpdatedListener()
    }
  }, [logId])

  // Expose manual refresh for generic external updates
  const refresh = () => {
    void load()
  }

  useEffect(() => {
    void load()
  }, [logId])

  return { log, loading, refresh }
}
