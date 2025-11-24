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
  onClose: () => void
}

export function Sidebar({ selectedLog, onSelect, onClose }: Props) {
  const { displayLogs, loading } = useIndexedLogData()
  const { filteredLogs, filterText, setFilterText } = useLogFilter(displayLogs)

  const selectedSidebarItem = useMemo(
    () => displayLogs.find((v) => v.id === selectedLog?.id),
    [displayLogs, selectedLog?.id],
  )

  useSidebarShortcuts({
    displayLogs: filteredLogs,
    onSelect,
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
                    onClick={() => {
                      onSelect(log)
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
