import { useEffect, useRef, useState } from 'react'
import { getVideoPosition, saveVideoPosition } from '../../../../../shared/ipc'

interface UseRememberMediaPositionProps {
  videoRef: React.RefObject<HTMLVideoElement>
  vlogId: string
  onTimeUpdate?: (currentTime: number) => void
  onSeeked?: (currentTime: number) => void
  onLoadedData?: () => void
}

export function useRememberMediaPosition({
  videoRef,
  vlogId,
  onTimeUpdate,
  onSeeked,
  onLoadedData,
}: UseRememberMediaPositionProps) {
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false)

  // Reset restoration state when vlogId changes
  useEffect(() => {
    setHasRestoredPosition(false)
  }, [vlogId])

  // Restore video position on load
  useEffect(() => {
    const restorePosition = async () => {
      if (!videoRef.current || hasRestoredPosition) {
        return
      }

      try {
        const positionData = await getVideoPosition(vlogId)
        if (positionData && videoRef.current) {
          videoRef.current.currentTime = positionData.position
          setHasRestoredPosition(true)
        }
      } catch (error) {
        console.error('Failed to restore video position:', error)
      }
    }

    // Wait for video to be ready
    const video = videoRef.current
    if (video) {
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA
        restorePosition()
      } else {
        const handleLoadedData = () => {
          restorePosition()
          video.removeEventListener('loadeddata', handleLoadedData)
        }
        video.addEventListener('loadeddata', handleLoadedData)
        return () => {
          video.removeEventListener('loadeddata', handleLoadedData)
        }
      }
    }
  }, [vlogId, hasRestoredPosition, videoRef])

  // Track video position changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    let saveTimeout: NodeJS.Timeout

    const handleTimeUpdate = () => {
      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }

      // Save position after 2 seconds of no changes (debounced)
      saveTimeout = setTimeout(() => {
        if (video.currentTime > 0) {
          saveVideoPosition(vlogId, video.currentTime).catch(
            (error: unknown) => {
              console.error('Failed to save video position:', error)
            },
          )
        }
      }, 2000)

      // Call external onTimeUpdate callback
      onTimeUpdate?.(video.currentTime)
    }

    const handleSeeked = () => {
      // Save position immediately when user seeks
      if (video.currentTime > 0) {
        saveVideoPosition(vlogId, video.currentTime).catch((error: unknown) => {
          console.error('Failed to save video position:', error)
        })
      }

      // Call external onSeeked callback
      onSeeked?.(video.currentTime)
    }

    const handleLoadedData = () => {
      onLoadedData?.()
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('loadeddata', handleLoadedData)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('loadeddata', handleLoadedData)
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
    }
  }, [vlogId, onTimeUpdate, onSeeked, onLoadedData, videoRef])
}
