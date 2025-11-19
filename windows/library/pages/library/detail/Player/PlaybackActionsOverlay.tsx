import { useEffect, useState, useRef } from 'react'
import { usePlaybackPreferences } from '../../../../../shared/PlaybackPreferencesProvider'

interface PlaybackActionsOverlayProps {
  className?: string
}

export function PlaybackActionsOverlay({
  className = '',
}: PlaybackActionsOverlayProps) {
  const { isMuted, playbackSpeed, skipSilence, isLoading } =
    usePlaybackPreferences()
  const [isVisible, setIsVisible] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle playback speed changes
  useEffect(() => {
    // Don't show overlay while loading or on first initialization
    if (isLoading || !isInitialized) {
      if (!isLoading) {
        setIsInitialized(true)
      }
      return
    }

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
  }, [playbackSpeed, isInitialized, isLoading])

  // Handle mute changes
  useEffect(() => {
    // Don't show overlay while loading or on first initialization
    if (isLoading || !isInitialized) {
      return
    }

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
  }, [isMuted, isInitialized, isLoading])

  // Handle skip silence changes
  useEffect(() => {
    // Don't show overlay while loading or on first initialization
    if (isLoading || !isInitialized) {
      return
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setDisplayText(skipSilence ? 'Skip Silence: ON' : 'Skip Silence: OFF')
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
  }, [skipSilence, isInitialized, isLoading])

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
