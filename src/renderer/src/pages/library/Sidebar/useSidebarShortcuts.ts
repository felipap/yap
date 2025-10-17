import { useEffect, useRef } from 'react'
import { SidebarItem } from './index'

interface Args {
  displayVlogs: SidebarItem[]
  onVideoSelect: (file: SidebarItem) => void
  selectedVlog?: SidebarItem | null
}

function useSelectionHistory(selectedVlog?: SidebarItem | null) {
  const historyRef = useRef<SidebarItem[]>([])
  const prevSelectedRef = useRef<SidebarItem | null>(null)

  // Track selection changes to build history
  useEffect(() => {
    const prev = prevSelectedRef.current
    if (prev && selectedVlog && prev.id !== selectedVlog.id) {
      historyRef.current = [...historyRef.current, prev]
    }
    prevSelectedRef.current = selectedVlog ?? null
  }, [selectedVlog?.id])

  function popPrevious(): SidebarItem | undefined {
    const list = historyRef.current
    if (list.length === 0) {
      return undefined
    }
    const last = list[list.length - 1]
    historyRef.current = list.slice(0, list.length - 1)
    return last
  }

  return { popPrevious }
}

export function useSidebarShortcuts({
  displayVlogs,
  onVideoSelect,
  selectedVlog,
}: Args) {
  const { popPrevious } = useSelectionHistory(selectedVlog)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey) {
        return
      }

      const key = e.key
      if (key >= '0' && key <= '9') {
        e.preventDefault()

        let index = parseInt(key, 10)
        if (index === 0) {
          index = 10
        }

        const target = displayVlogs[index - 1]
        if (target) {
          onVideoSelect(target)
        }
      } else if (key === '[') {
        // Cmd + [ navigates to previously selected vlog
        const previous = popPrevious()
        if (previous) {
          e.preventDefault()
          onVideoSelect(previous)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [displayVlogs, onVideoSelect, popPrevious])
}
