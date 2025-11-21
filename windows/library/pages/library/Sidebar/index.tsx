import { useEffect, useMemo } from 'react'
import { useLogData } from '../../../../shared/useLogData'
import { EnrichedLog } from '../../../types'
import { FilterBox } from './FilterBox'
import { buildSearchableDate, formatDateOrRelative } from './formatters'
import { Item } from './Item'
import { useLogFilter } from './useLogFilter'
import { useSidebarShortcuts } from './useSidebarShortcuts'

export type SidebarItem = EnrichedLog & {
  dayIndex?: number
  displayTitle: string
  searchableText: string
}
export { useLogFilter } from './useLogFilter'

interface Props {
  selectedLog: EnrichedLog | null
  onVideoSelect: (file: EnrichedLog) => void
  onClose: () => void
}

export function Sidebar({ selectedLog, onVideoSelect, onClose }: Props) {
  const { displayLogs, loading } = useIndexedLogData()
  const { filteredLogs, filterText, setFilterText } = useLogFilter(displayLogs)

  const selectedSidebarItem = useMemo(
    () => displayLogs.find((v) => v.id === selectedLog?.id),
    [displayLogs, selectedLog?.id],
  )

  useSidebarShortcuts({
    displayLogs: filteredLogs,
    onVideoSelect,
    selectedLog: selectedSidebarItem,
    onUnselect: onClose,
  })

  return (
    <div className="w-[240px] h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 divide/20 py-1 px-0.5">
          {filteredLogs.map((log) => (
            <Item
              key={log.id}
              data={log}
              selected={selectedLog?.id === log.id}
              onClick={() => {
                onVideoSelect(log)
              }}
            />
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center text-xs text-secondary/50 p-4 track-10">
              {filterText
                ? 'Nothing found'
                : loading
                  ? 'Loading...'
                  : 'No logs yet'}
            </div>
          )}
        </div>
      </div>

      <FilterBox value={filterText} onChange={setFilterText} />
    </div>
  )
}

function useIndexedLogData() {
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
    return logs.map((file: EnrichedLog) => {
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
