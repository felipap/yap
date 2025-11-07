import { useEffect, useState } from 'react'
import { usePlaybackPreferences } from '../../../../../shared/PlaybackPreferencesProvider'

interface PlaybackActionsOverlayProps {
  className?: string
}

export function PlaybackActionsOverlay({
  className = '',
}: PlaybackActionsOverlayProps) {
  const { isMuted, playbackSpeed } = usePlaybackPreferences()
  const [isVisible, setIsVisible] = useState(false)
  const [displaySpeed, setDisplaySpeed] = useState(playbackSpeed)
  const [displayMuted, setDisplayMuted] = useState(isMuted)
  const [isInitialized, setIsInitialized] = useState(false)
  const [actionType, setActionType] = useState<'speed' | 'mute' | null>(null)

  useEffect(() => {
    // Skip the first render to avoid showing overlay on mount
    if (!isInitialized) {
      setDisplaySpeed(playbackSpeed)
      setDisplayMuted(isMuted)
      setIsInitialized(true)
      return
    }

    // Check if playback speed changed
    if (playbackSpeed !== displaySpeed) {
      setDisplaySpeed(playbackSpeed)
      setActionType('speed')
      setIsVisible(true)

      // Hide overlay after 2 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        setActionType(null)
      }, 2000)

      return () => clearTimeout(timer)
    }

    // Check if mute state changed
    if (isMuted !== displayMuted) {
      setDisplayMuted(isMuted)
      setActionType('mute')
      setIsVisible(true)

      // Hide overlay after 2 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        setActionType(null)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [playbackSpeed, isMuted, displaySpeed, displayMuted, isInitialized])

  const getDisplayText = () => {
    if (actionType === 'speed') {
      return `${displaySpeed}x`
    }
    if (actionType === 'mute') {
      return displayMuted ? 'Muted' : 'Unmuted'
    }
    return ''
  }

  return (
    <div
      className={`absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-medium transition-opacity duration-300 pointer-events-none z-10 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {getDisplayText()}
    </div>
  )
}
