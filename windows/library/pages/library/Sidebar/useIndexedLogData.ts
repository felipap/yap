import { useEffect, useMemo, useState } from 'react'
import { getSidebarLogs } from '../../../../shared/ipc'
import { SidebarLog } from '../../../types'
import { buildSearchableDate, formatDateOrRelative } from './formatters'

export type SidebarItem = SidebarLog & {
  dayIndex?: number
  displayTitle: string
  // Used to search for the log
  searchableText: string
}

// Return logs with their day index and display title.
export function useIndexedLogData() {
  const { logs, loading } = useLogData()

  function getKeyForDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const displayLogs: SidebarItem[] = useMemo(() => {
    // Build a day key map (YYYY-MM-DD) to total counts
    const dayToCount = new Map<string, number>()
    for (const file of logs) {
      const d = file.created
      const key = getKeyForDate(d)
      dayToCount.set(key, (dayToCount.get(key) || 0) + 1)
    }

    // Compute per-day running index in chronological order (oldest first)
    const dayToRunningIndex = new Map<string, number>()
    const idToDayIndex = new Map<string, number>()

    const ascendingByTime = [...logs].sort(
      (a, b) => a.created.getTime() - b.created.getTime(),
    )

    for (const file of ascendingByTime) {
      const key = getKeyForDate(file.created)
      const totalForDay = dayToCount.get(key) || 0
      if (totalForDay <= 1) {
        continue
      }
      const next = (dayToRunningIndex.get(key) || 0) + 1
      dayToRunningIndex.set(key, next)
      idToDayIndex.set(file.id, next)
    }

    // Map back to original order with computed indices and display title
    return logs.map((file: SidebarLog) => {
      const displayTitle = file.title || formatDateOrRelative(file.created)
      const searchableDate = buildSearchableDate(file.created)
      const searchableText = [
        displayTitle,
        file.title || '',
        file.name || '',
        searchableDate,
      ]
        .join(' ')
        .toLowerCase()

      return {
        ...file,
        dayIndex: idToDayIndex.get(file.id),
        displayTitle,
        searchableText,
      }
    })
  }, [logs])

  return { displayLogs, loading }
}

export function useLogData() {
  // const { stateCount } = useBackendState()

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<SidebarLog[]>([])

  const loadLogs = async () => {
    try {
      setLoading(true)
      console.log('calling getSidebarLogs')
      const files = await getSidebarLogs()
      setLogs(files)
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // Refresh file list periodically
    const intervalId = setInterval(loadLogs, 3000)

    // Subscribe to general log changes
    const handleStateChange = () => {
      void loadLogs()
    }
    // onStateChange(handleStateChange)

    return () => {
      clearInterval(intervalId)
      // removeLogUpdatedListener()
    }
  }, [])

  return { logs, loading }
}
