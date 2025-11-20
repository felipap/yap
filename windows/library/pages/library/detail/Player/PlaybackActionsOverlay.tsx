import { useEffect, useState, useRef } from 'react'
import { usePlaybackPreferences } from '../../../../../shared/PlaybackPreferencesProvider'

interface PlaybackActionsOverlayProps {
  className?: string
  logId: string
}

export function PlaybackActionsOverlay({
  className = '',
  logId,
}: PlaybackActionsOverlayProps) {
  const { isMuted, playbackSpeed, isLoading } =
    usePlaybackPreferences()
  const [isVisible, setIsVisible] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const prevMutedRef = useRef<boolean | null>(null)
  const prevPlaybackSpeedRef = useRef<number | null>(null)
  const isInitialMountRef = useRef(true)

  // Reset tracking refs when video changes
  useEffect(() => {
    prevMutedRef.current = null
    prevPlaybackSpeedRef.current = null
    isInitialMountRef.current = true
    setIsVisible(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [logId])

  // Initialize refs once preferences are loaded
  useEffect(() => {
    if (!isLoading && isInitialMountRef.current) {
      prevMutedRef.current = isMuted
      prevPlaybackSpeedRef.current = playbackSpeed
      isInitialMountRef.current = false
    }
  }, [isLoading, isMuted, playbackSpeed])

  // Handle playback speed changes
  useEffect(() => {
    // Don't show overlay while loading or on initial mount
    if (isLoading || isInitialMountRef.current) {
      return
    }

    // Only show if playback speed actually changed
    if (prevPlaybackSpeedRef.current === playbackSpeed) {
      return
    }

    prevPlaybackSpeedRef.current = playbackSpeed

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setDisplayText(`${playbackSpeed}x`)
    setIsVisible(true)

    // Hide overlay after 2 seconds
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 2000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [playbackSpeed, isLoading])

  // Handle mute changes
  useEffect(() => {
    // Don't show overlay while loading or on initial mount
    if (isLoading || isInitialMountRef.current) {
      return
    }

    // Only show if mute state actually changed
    if (prevMutedRef.current === isMuted) {
      return
    }

    prevMutedRef.current = isMuted

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setDisplayText(isMuted ? 'Muted' : 'Unmuted')
    setIsVisible(true)

    // Hide overlay after 2 seconds
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 2000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isMuted, isLoading])


  return (
    <div
      className={`absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg text-lg font-medium transition-opacity duration-300 pointer-events-none z-10 ${
        isVisible ? 'opacity-100' : '!opacity-0'
      } ${className}`}
    >
      {displayText}
    </div>
  )
}
