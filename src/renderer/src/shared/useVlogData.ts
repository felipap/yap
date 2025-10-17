import { useEffect, useState } from 'react'
import {
  getRecordedFiles,
  getVlog,
  onVlogRemoved,
  onVlogUpdated,
  removeVlogRemovedListener,
  removeVlogUpdatedListener,
} from '../ipc'
import { RecordedFile } from '../types'

export function useVlogData() {
  const [vlogs, setVlogs] = useState<RecordedFile[]>([])

  useEffect(() => {
    loadVlogs()

    // Refresh file list periodically
    const intervalId = setInterval(loadVlogs, 2000)

    // Subscribe to general vlog changes
    const handleVlogListChange = () => {
      void loadVlogs()
    }
    onVlogUpdated(handleVlogListChange)
    onVlogRemoved(handleVlogListChange)

    return () => {
      clearInterval(intervalId)
      removeVlogUpdatedListener()
      removeVlogRemovedListener()
    }
  }, [])

  const loadVlogs = async () => {
    try {
      const files = await getRecordedFiles()
      setVlogs(files)
    } catch (error) {
      console.error('Failed to load vlogs:', error)
    }
  }

  return { vlogs }
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
    load()

    // Refresh periodically as a fallback
    const intervalId = setInterval(load, 2000)

    // React to general vlog updated/removed events
    const handleGeneralVlogEvent = (eventVlogId: string) => {
      if (eventVlogId === vlogId) {
        void load()
      }
    }
    onVlogUpdated(handleGeneralVlogEvent)
    onVlogRemoved(handleGeneralVlogEvent)

    return () => {
      clearInterval(intervalId)
      removeVlogUpdatedListener()
      removeVlogRemovedListener()
    }
  }, [vlogId])

  // Expose manual refresh for generic external updates
  const refresh = () => {
    void load()
  }

  return { vlog, loading, refresh }
}
