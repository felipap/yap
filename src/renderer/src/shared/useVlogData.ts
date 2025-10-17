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

  useEffect(() => {
    load()

    // Refresh file list periodically
    const intervalId = setInterval(load, 2000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const vlog = await getVlog(vlogId)
      setVlog(vlog)
    } catch (error) {
      console.error('Failed to load vlog:', error)
    } finally {
      setLoading(false)
    }
  }

  return { vlog, loading }
}
