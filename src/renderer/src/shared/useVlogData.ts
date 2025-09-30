import { useEffect, useState } from 'react'
import { getRecordedFiles } from '../ipc'
import { RecordedFile } from '../types'

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
