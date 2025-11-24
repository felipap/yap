import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 62, // 70px item height + 4px gap
    overscan: 5,
  })

  return (
    <div className="w-[240px] h-full flex flex-col">
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-xs text-secondary/50 p-4 track-10">
            {filterText
              ? 'Nothing found'
              : loading
                ? 'Loading...'
                : 'No logs yet'}
          </div>
        ) : (
          <div
            className="relative pt-[4px] pb-[4px] w-full"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const log = filteredLogs[virtualItem.index]
              return (
                <div
                  key={log.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '2px',
                    right: '2px',
                    width: 'calc(100% - 4px)',
                    height: '60px',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Item
                    data={log}
                    selected={selectedLog?.id === log.id}
                    onClick={() => {
                      onVideoSelect(log)
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
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
