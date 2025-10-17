import { useMemo } from 'react'
import { RecordedFile } from '../../../types'
import { useVlogData } from '../../../shared/useVlogData'
import { Item } from './Item'

export type SidebarItem = RecordedFile & { dayIndex?: number }

interface Props {
  selectedVlog: RecordedFile | null
  onVideoSelect: (file: RecordedFile) => void
  onClose: () => void
}

export function Sidebar({ selectedVlog, onVideoSelect, onClose }: Props) {
  const { displayVlogs } = useIndexedVlogData()

  return (
    <div className="w-[280px] flex-shrink-0 border-r border-one bg-two overflow-y-auto">
      <div className="flex flex-col gap-0">
        {displayVlogs.map((vlog) => (
          <Item
            key={vlog.id}
            data={vlog}
            selected={selectedVlog?.id === vlog.id}
            onClick={() => {
              onVideoSelect(vlog)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function useIndexedVlogData() {
  const { vlogs } = useVlogData()

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

    // Map back to original order with computed indices
    return vlogs.map((file) => ({
      ...file,
      dayIndex: idToDayIndex.get(file.id),
    }))
  }, [vlogs.length])

  return { displayVlogs }
}
