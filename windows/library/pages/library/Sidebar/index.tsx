import { useEffect, useMemo } from 'react'
import { useVlogData } from '../../../../shared/useVlogData'
import { EnrichedLog } from '../../../types'
import { FilterBox } from './FilterBox'
import { buildSearchableDate, formatDateOrRelative } from './formatters'
import { Item } from './Item'
import { useVlogFilter } from './useVlogFilter'
import { useSidebarShortcuts } from './useSidebarShortcuts'

export type SidebarItem = EnrichedLog & {
  dayIndex?: number
  displayTitle: string
  searchableText: string
}
export { useVlogFilter } from './useVlogFilter'

interface Props {
  selectedVlog: EnrichedLog | null
  onVideoSelect: (file: EnrichedLog) => void
  onClose: () => void
}

export function Sidebar({ selectedVlog, onVideoSelect, onClose }: Props) {
  const { displayVlogs, loading } = useIndexedVlogData()
  const { filteredVlogs, filterText, setFilterText } =
    useVlogFilter(displayVlogs)

  const selectedSidebarItem = useMemo(
    () => displayVlogs.find((v) => v.id === selectedVlog?.id),
    [displayVlogs, selectedVlog?.id],
  )

  useSidebarShortcuts({
    displayVlogs: filteredVlogs,
    onVideoSelect,
    selectedVlog: selectedSidebarItem,
  })

  return (
    <div className="w-[240px] h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0 divide-y divide/20">
          {filteredVlogs.map((vlog) => (
            <Item
              key={vlog.id}
              data={vlog}
              selected={selectedVlog?.id === vlog.id}
              onClick={() => {
                onVideoSelect(vlog)
              }}
            />
          ))}
          {filteredVlogs.length === 0 && (
            <div className="text-center text-xs text-secondary/50 p-4 track-10">
              {filterText
                ? 'Nothing found'
                : loading
                  ? 'Loading...'
                  : 'No vlogs yet'}
            </div>
          )}
        </div>
      </div>

      <FilterBox value={filterText} onChange={setFilterText} />
    </div>
  )
}

function useIndexedVlogData() {
  const { vlogs, loading } = useVlogData()

  function getKeyForDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const displayVlogs: SidebarItem[] = useMemo(() => {
    // Build a day key map (YYYY-MM-DD) to total counts
    const dayToCount = new Map<string, number>()
    for (const file of vlogs) {
      const d = file.created
      const key = getKeyForDate(d)
      dayToCount.set(key, (dayToCount.get(key) || 0) + 1)
    }

    // Compute per-day running index in chronological order (oldest first)
    const dayToRunningIndex = new Map<string, number>()
    const idToDayIndex = new Map<string, number>()

    const ascendingByTime = [...vlogs].sort(
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
    return vlogs.map((file: EnrichedLog) => {
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
  }, [vlogs])

  return { displayVlogs, loading }
}
