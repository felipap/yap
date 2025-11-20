import { useEffect, RefObject } from 'react'
import { usePlaybackPreferences } from '../../../../../shared/PlaybackPreferencesProvider'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
}

export function useSyncVideoPlaybackPreferences({ videoRef }: Props) {
  const { isMuted, setMuted, playbackSpeed, setPlaybackSpeed } =
    usePlaybackPreferences()
  // Sync video element muted state with global state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // Sync video element playback rate with global state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Listen for video element mute changes and sync with global state
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleVolumeChange = () => {
      if (video.muted !== isMuted) {
        setMuted(video.muted)
      }
    }

    video.addEventListener('volumechange', handleVolumeChange)
    return () => {
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [isMuted, setMuted])

  // Listen for video element playback rate changes and sync with global state
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleRateChange = () => {
      if (video.playbackRate !== playbackSpeed) {
        setPlaybackSpeed(video.playbackRate)
      }
    }

    video.addEventListener('ratechange', handleRateChange)
    return () => {
      video.removeEventListener('ratechange', handleRateChange)
    }
  }, [playbackSpeed, setPlaybackSpeed])
}
