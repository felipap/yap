import { useEffect, useRef } from 'react'
import { SidebarItem } from './index'

interface Args {
  displayVlogs: SidebarItem[]
  onVideoSelect: (file: SidebarItem) => void
  selectedVlog?: SidebarItem | null
  onUnselect?: () => void
}

function useSelectionHistory(selectedVlog?: SidebarItem | null) {
  const backStackRef = useRef<SidebarItem[]>([])
  const forwardStackRef = useRef<SidebarItem[]>([])
  const prevSelectedRef = useRef<SidebarItem | null>(null)
  const navTypeRef = useRef<null | 'back' | 'forward'>(null)

  // Track selection changes to build history for normal navigation only
  useEffect(() => {
    const prev = prevSelectedRef.current
    if (prev && selectedVlog && prev.id !== selectedVlog.id) {
      if (navTypeRef.current === null) {
        backStackRef.current = [...backStackRef.current, prev]
        forwardStackRef.current = []
      }
    }
    prevSelectedRef.current = selectedVlog ?? null
    navTypeRef.current = null
  }, [selectedVlog?.id])

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
  displayVlogs,
  onVideoSelect,
  selectedVlog,
  onUnselect,
}: Args) {
  const { goBack, goForward } = useSelectionHistory(selectedVlog)

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
        if (selectedVlog && onUnselect) {
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
        const currentIndex = selectedVlog
          ? displayVlogs.findIndex((v) => v.id === selectedVlog.id)
          : -1
        const nextIndex = Math.min(currentIndex + 1, displayVlogs.length - 1)
        const nextItem = displayVlogs[nextIndex]
        if (nextItem && nextIndex !== currentIndex) {
          onVideoSelect(nextItem)
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
        const currentIndex = selectedVlog
          ? displayVlogs.findIndex((v) => v.id === selectedVlog.id)
          : displayVlogs.length
        const prevIndex = Math.max(currentIndex - 1, 0)
        const prevItem = displayVlogs[prevIndex]
        if (prevItem && prevIndex !== currentIndex) {
          onVideoSelect(prevItem)
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

        const target = displayVlogs[index - 1]
        if (target) {
          onVideoSelect(target)
        }
      } else if (key === '[') {
        // Cmd + [ navigates back in selection history
        const previous = goBack(selectedVlog ?? null)
        if (previous) {
          e.preventDefault()
          onVideoSelect(previous)
        }
      } else if (key === ']') {
        // Cmd + ] navigates forward in selection history
        const next = goForward(selectedVlog ?? null)
        if (next) {
          e.preventDefault()
          onVideoSelect(next)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [displayVlogs, onVideoSelect, goBack, goForward, selectedVlog, onUnselect])
}
