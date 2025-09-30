import { useEffect, useCallback } from 'react'

interface UseVideoShortcutsProps {
  videoRef: React.RefObject<HTMLVideoElement>
}

export function useVideoShortcuts({ videoRef }: UseVideoShortcutsProps) {
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) {
      return
    }

    if (videoRef.current.paused) {
      videoRef.current.play()
    } else {
      videoRef.current.pause()
    }
  }, [videoRef])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.muted = !videoRef.current.muted
  }, [videoRef])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Prevent default behavior for space key to avoid page scrolling
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlayPause()
      }

      // Handle 'm' key for mute/unmute
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        toggleMute()
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [togglePlayPause, toggleMute])
}
