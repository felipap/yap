import { useEffect, useRef, useState } from 'react'
import {
  getRecordedFiles,
  getVlog,
  onStateChange,
  onVlogUpdated,
  removeVlogUpdatedListener,
} from './ipc'
import { RecordedFile, State } from '../library/types'

export async function setPartialState(state: Partial<State>) {
  return await window.electronAPI.setPartialState(state)
}

export function useBackendState() {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<State | null>(null)
  const stateRef = useRef<State | null>(null)
  const stateCount = useRef(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const state = await window.electronAPI.getState()
      stateRef.current = state
      stateCount.current++
      setState(state)
      setLoading(false)
    }
    load()

    // Subscribe to state changes
    const unsubscribe = window.electronAPI.onStateChange((newState) => {
      stateRef.current = newState
      setState(newState)
      stateCount.current++
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  return {
    state,
    stateRef,
    setPartialState,
    loading,
    stateCount: stateCount.current,
  }
}

export function useVlogData() {
  const { stateCount } = useBackendState()

  const [loading, setLoading] = useState(false)
  const [vlogs, setVlogs] = useState<RecordedFile[]>([])

  useEffect(() => {
    loadVlogs()

    // // Refresh file list periodically
    // // const intervalId = setInterval(loadVlogs, 2000)

    // // Subscribe to general vlog changes
    // const handleStateChange = () => {
    //   void loadVlogs()
    // }
    // onStateChange(handleStateChange)

    // return () => {
    //   // clearInterval(intervalId)
    //   removeVlogUpdatedListener()
    // }
  }, [stateCount])

  const loadVlogs = async () => {
    try {
      setLoading(true)
      const files = await getRecordedFiles()
      setVlogs(files)
    } catch (error) {
      console.error('Failed to load vlogs:', error)
    } finally {
      setLoading(false)
    }
  }

  return { vlogs, loading }
}

export function useVlog(vlogId: string | null) {
  const [vlog, setVlog] = useState<RecordedFile | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!vlogId) {
      return
    }
    setLoading(true)
    try {
      const fresh = await getVlog(vlogId)
      setVlog(fresh)
    } catch (error) {
      console.error('Failed to load vlog:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!vlogId) {
      return
    }

    // Refresh periodically as a fallback
    const intervalId = setInterval(load, 1000)

    // React to general vlog updated/removed events
    const handleGeneralVlogEvent = (eventVlogId: string) => {
      if (eventVlogId === vlogId) {
        void load()
      }
    }
    onVlogUpdated(handleGeneralVlogEvent)

    return () => {
      clearInterval(intervalId)
      removeVlogUpdatedListener()
    }
  }, [vlogId])

  // Expose manual refresh for generic external updates
  const refresh = () => {
    void load()
  }

  useEffect(() => {
    void load()
  }, [vlogId])

  return { vlog, loading, refresh }
}
