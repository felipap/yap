import { useMemo, useState } from 'react'
import { SidebarItem } from '.'

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
