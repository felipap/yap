import { useEffect, useCallback } from 'react'
import { PlayerRef } from './Player'
import { usePlaybackPreferences } from '../../../../shared/PlaybackPreferencesProvider'

interface Args {
  playerRef: React.RefObject<PlayerRef>
  onBack: () => void
}

export function usePlayerShortcuts({ playerRef, onBack }: Args) {
  const { toggleMute, playbackSpeed, setPlaybackSpeed } =
    usePlaybackPreferences()

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) {
      return
    }

    if (playerRef.current.paused) {
      playerRef.current.play()
    } else {
      playerRef.current.pause()
    }
  }, [playerRef])

  const cyclePlaybackSpeed = useCallback(() => {
    const speeds = [1.0, 1.5, 2.0, 3.0]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    const nextSpeed = speeds[nextIndex]

    setPlaybackSpeed(nextSpeed)
  }, [playbackSpeed, setPlaybackSpeed])

  const increasePlaybackSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0]
    const currentIndex = speeds.indexOf(playbackSpeed)
    if (currentIndex < speeds.length - 1) {
      setPlaybackSpeed(speeds[currentIndex + 1])
    }
  }, [playbackSpeed, setPlaybackSpeed])

  const decreasePlaybackSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0]
    const currentIndex = speeds.indexOf(playbackSpeed)
    if (currentIndex > 0) {
      setPlaybackSpeed(speeds[currentIndex - 1])
    }
  }, [playbackSpeed, setPlaybackSpeed])

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
        console.log('space pressed => togglePlayPause')
        event.preventDefault()
        togglePlayPause()
      }

      // Handle 'm' key for mute/unmute
      if (event.key.toLowerCase() === 'm') {
        console.log('m pressed => toggleMute')
        event.preventDefault()
        toggleMute()
      }

      // Handle 's' key for cycling playback speed
      if (event.key.toLowerCase() === 's') {
        if (event.shiftKey) {
          console.log('shift+s pressed => decreasePlaybackSpeed')
          event.preventDefault()
          decreasePlaybackSpeed()
        } else {
          console.log('s pressed => cyclePlaybackSpeed')
          event.preventDefault()
          cyclePlaybackSpeed()
        }
      }

      // Handle '>' key for increasing playback speed
      if (event.key === '>') {
        console.log('> pressed => increasePlaybackSpeed')
        event.preventDefault()
        increasePlaybackSpeed()
      }

      // Handle '<' key for decreasing playback speed
      if (event.key === '<') {
        console.log('< pressed => decreasePlaybackSpeed')
        event.preventDefault()
        decreasePlaybackSpeed()
      }

      // Handle Escape key to unselect video
      if (event.key === 'Escape') {
        console.log('escape pressed => onBack')
        event.preventDefault()
        onBack()
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    togglePlayPause,
    toggleMute,
    cyclePlaybackSpeed,
    increasePlaybackSpeed,
    decreasePlaybackSpeed,
    onBack,
  ])
}
