import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { SidebarLog } from '../../../types'
import { FilterBox } from './FilterBox'
import { Item } from './Item'
import { SidebarItem, useIndexedLogData } from './useIndexedLogData'
import { useSidebarShortcuts } from './useSidebarShortcuts'

interface Props {
  selectedLog: SidebarLog | null
  onSelect: (file: SidebarLog) => void
  unselect: () => void
}

export function Sidebar({ selectedLog, onSelect, unselect }: Props) {
  const { displayLogs, loading } = useIndexedLogData()
  const {
    filteredLogs: filteredLogs_,
    filterText,
    setFilterText,
  } = useLogFilter(displayLogs)
  const filteredLogs = filteredLogs_.filter((v) => {
    // return true
    console.log('v.created.getTime()', v.created.getTime())
    console.log(
      "new Date('2025-11-26').getTime()",
      new Date('2025-11-26').getTime(),
    )
    const isOldVideo = v.created.getTime() < new Date('2025-11-28').getTime()
    if (!isOldVideo) {
      return false
    }
    if (
      [
        'new song',
        'a riff',
        'hospital with Vini',
        'happy to be in ny',
        'Nov 19, 2025',
        'Nov 24, 2025',
        'part 2',
        'Nov 18, 2025',
      ].includes(v.displayTitle)
    ) {
      return false
    }
    if (v.displayTitle === 'a riff') {
      return false
    }
    if (v.displayTitle === 'Nov 19, 2025') {
      return false
    }
    if (v.dayIndex === 3 && v.displayTitle === 'Nov 24, 2025') {
      return false
    }
    if (v.dayIndex === 2 && v.displayTitle === 'Nov 27, 2025') {
      return false
    }
    return true
  })

  const selectedSidebarItem = useMemo(
    () => displayLogs.find((v) => v.id === selectedLog?.id),
    [displayLogs, selectedLog?.id],
  )

  useSidebarShortcuts({
    displayLogs: filteredLogs,
    onSelect,
    selectedLog: selectedSidebarItem,
    onUnselect: unselect,
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
      <div ref={parentRef} className="flex-1 overflow-y-auto pt-1">
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
                    onSelect={onSelect}
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

export function useLogFilter(displayLogs: SidebarItem[]) {
  const [filterText, setFilterText] = useState('')

  const filteredLogs = useMemo(() => {
    if (!filterText.trim()) {
      return displayLogs
    }

    const searchTerm = filterText.toLowerCase()
    return displayLogs.filter((log) => {
      return log.searchableText.includes(searchTerm)
    })
  }, [displayLogs, filterText])

  return {
    filteredLogs,
    filterText,
    setFilterText,
  }
}
