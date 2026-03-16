import { RefObject, useEffect, useRef, useState } from 'react'

export function useAutoHideControls(
  containerRef: RefObject<HTMLDivElement>,
  isPlaying: boolean,
  hideDelayMs = 3000,
) {
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container) {
      return
    }

    const clearHideTimer = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current)
        hideTimer.current = null
      }
    }

    const resetHideTimer = () => {
      setShowControls(true)
      clearHideTimer()
      if (isPlaying) {
        hideTimer.current = setTimeout(() => {
          setShowControls(false)
        }, hideDelayMs)
      }
    }

    const handleMouseMove = () => {
      resetHideTimer()
    }

    const handleMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false)
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    resetHideTimer()

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      clearHideTimer()
    }
  }, [containerRef, isPlaying, hideDelayMs])

  return showControls
}
