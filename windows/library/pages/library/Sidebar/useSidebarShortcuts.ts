import { useEffect, useRef } from 'react'
import { SidebarItem } from './index'

interface Args {
  displayLogs: SidebarItem[]
  onSelect: (file: SidebarItem) => void
  selectedLog?: SidebarItem | null
  onUnselect?: () => void
}

function useSelectionHistory(selectedLog?: SidebarItem | null) {
  const backStackRef = useRef<SidebarItem[]>([])
  const forwardStackRef = useRef<SidebarItem[]>([])
  const prevSelectedRef = useRef<SidebarItem | null>(null)
  const navTypeRef = useRef<null | 'back' | 'forward'>(null)

  // Track selection changes to build history for normal navigation only
  useEffect(() => {
    const prev = prevSelectedRef.current
    if (prev && selectedLog && prev.id !== selectedLog.id) {
      if (navTypeRef.current === null) {
        backStackRef.current = [...backStackRef.current, prev]
        forwardStackRef.current = []
      }
    }
    prevSelectedRef.current = selectedLog ?? null
    navTypeRef.current = null
  }, [selectedLog?.id])

  function goBack(
    current: SidebarItem | null | undefined,
  ): SidebarItem | undefined {
    const list = backStackRef.current
    if (list.length === 0) {
      return undefined
    }
    const previous = list[list.length - 1]
    backStackRef.current = list.slice(0, list.length - 1)
    if (current) {
      forwardStackRef.current = [...forwardStackRef.current, current]
    }
    navTypeRef.current = 'back'
    return previous
  }

  function goForward(
    current: SidebarItem | null | undefined,
  ): SidebarItem | undefined {
    const list = forwardStackRef.current
    if (list.length === 0) {
      return undefined
    }
    const next = list[list.length - 1]
    forwardStackRef.current = list.slice(0, list.length - 1)
    if (current) {
      backStackRef.current = [...backStackRef.current, current]
    }
    navTypeRef.current = 'forward'
    return next
  }

  return { goBack, goForward }
}

export function useSidebarShortcuts({
  displayLogs,
  onSelect,
  selectedLog,
  onUnselect,
}: Args) {
  const { goBack, goForward } = useSelectionHistory(selectedLog)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key

      // ESC: unselect current file
      if (key === 'Escape') {
        const target = e.target as HTMLElement | null
        const isEditable =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        if (isEditable) {
          return
        }
        if (selectedLog && onUnselect) {
          e.preventDefault()
          onUnselect()
        }
        return
      }

      // Arrow navigation (no modifier): move selection up/down
      if (key === 'ArrowDown') {
        // Avoid interfering with text inputs/contenteditable
        const target = e.target as HTMLElement | null
        const isEditable =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        if (isEditable) {
          return
        }
        e.preventDefault()
        const currentIndex = selectedLog
          ? displayLogs.findIndex((v) => v.id === selectedLog.id)
          : -1
        const nextIndex = Math.min(currentIndex + 1, displayLogs.length - 1)
        const nextItem = displayLogs[nextIndex]
        if (nextItem && nextIndex !== currentIndex) {
          onSelect(nextItem)
        }
        return
      } else if (key === 'ArrowUp') {
        const target = e.target as HTMLElement | null
        const isEditable =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        if (isEditable) {
          return
        }
        e.preventDefault()
        const currentIndex = selectedLog
          ? displayLogs.findIndex((v) => v.id === selectedLog.id)
          : displayLogs.length
        const prevIndex = Math.max(currentIndex - 1, 0)
        const prevItem = displayLogs[prevIndex]
        if (prevItem && prevIndex !== currentIndex) {
          onSelect(prevItem)
        }
        return
      }

      if (!e.metaKey) {
        return
      }

      // Cmd-modified shortcuts
      if (key >= '0' && key <= '9') {
        e.preventDefault()

        let index = parseInt(key, 10)
        if (index === 0) {
          index = 10
        }

        const target = displayLogs[index - 1]
        if (target) {
          onSelect(target)
        }
      } else if (key === '[') {
        // Cmd + [ navigates back in selection history
        const previous = goBack(selectedLog ?? null)
        if (previous) {
          e.preventDefault()
          onSelect(previous)
        }
      } else if (key === ']') {
        // Cmd + ] navigates forward in selection history
        const next = goForward(selectedLog ?? null)
        if (next) {
          e.preventDefault()
          onSelect(next)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [displayLogs, onSelect, goBack, goForward, selectedLog, onUnselect])
}
