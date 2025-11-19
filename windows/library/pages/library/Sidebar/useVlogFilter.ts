import { useMemo, useState } from 'react'
import { SidebarItem } from '.'

export function useVlogFilter(displayVlogs: SidebarItem[]) {
  const [filterText, setFilterText] = useState('')

  const filteredVlogs = useMemo(() => {
    if (!filterText.trim()) {
      return displayVlogs
    }

    const searchTerm = filterText.toLowerCase()
    return displayVlogs.filter((vlog) => {
      return vlog.searchableText.includes(searchTerm)
    })
  }, [displayVlogs, filterText])

  return {
    filteredVlogs,
    filterText,
    setFilterText,
  }
}
