import { useEffect, useState } from 'react'
import { getRecordedFiles, getVlog } from '../ipc'
import { RecordedFile, Vlog } from '../types'

export function useVlogData() {
  const [vlogs, setVlogs] = useState<RecordedFile[]>([])

  useEffect(() => {
    loadVlogs()

    // Refresh file list periodically
    const intervalId = setInterval(loadVlogs, 2000)

    return () => {
      clearInterval(intervalId)
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

export function useVlog(vlogId: string) {
  const [vlog, setVlog] = useState<Vlog | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const load = async () => {
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

    // React to main-process events that can change vlog data (generic ones)
    const handleTranscriptionProgress = (eventVlogId: string) => {
      if (eventVlogId === vlogId) {
        load()
      }
    }

    if (window.electronAPI.onTranscriptionProgressUpdated) {
      window.electronAPI.onTranscriptionProgressUpdated((id: string) =>
        handleTranscriptionProgress(id),
      )
    }

    return () => {
      clearInterval(intervalId)
      if (window.electronAPI.removeTranscriptionProgressListener) {
        window.electronAPI.removeTranscriptionProgressListener(
          handleTranscriptionProgress as any,
        )
      }
    }
  }, [vlogId])

  // Expose manual refresh for generic external updates
  const refresh = () => {
    void load()
  }

  return { vlog, loading, refresh }
}
