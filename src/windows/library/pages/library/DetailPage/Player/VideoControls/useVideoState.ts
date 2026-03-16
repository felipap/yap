import { RefObject, useEffect, useState } from 'react'

interface VideoState {
  isPlaying: boolean
  currentTime: number
  duration: number
  bufferedRanges: TimeRanges | null
  isMuted: boolean
  playbackSpeed: number
}

export function useVideoState(
  videoRef: RefObject<HTMLVideoElement>,
  isDraggingSeek: boolean,
): VideoState {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    setIsMuted(video.muted)
    setPlaybackSpeed(video.playbackRate)
    setDuration(video.duration || 0)
    setIsPlaying(!video.paused)

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => setIsMuted(video.muted)
    const handleRateChange = () => setPlaybackSpeed(video.playbackRate)
    const handleDurationChange = () => setDuration(video.duration)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleProgress = () => setBufferedRanges(video.buffered)
    const handleTimeUpdate = () => {
      if (!isDraggingSeek) {
        setCurrentTime(video.currentTime)
      }
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('ratechange', handleRateChange)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [videoRef, isDraggingSeek])

  return {
    isPlaying,
    currentTime,
    duration,
    bufferedRanges,
    isMuted,
    playbackSpeed,
  }
}

export function useVideoActions(
  videoRef: RefObject<HTMLVideoElement>,
  duration: number,
  playbackSpeed: number,
) {
  const speeds = [1, 1.25, 1.5, 1.75, 2]

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const skipBackward = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = Math.max(0, video.currentTime - 10)
  }

  const skipForward = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = Math.min(duration, video.currentTime + 10)
  }

  const cycleSpeed = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    video.playbackRate = speeds[nextIndex]
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.muted = !video.muted
  }

  const seekTo = (time: number) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = time
  }

  return {
    togglePlay,
    skipBackward,
    skipForward,
    cycleSpeed,
    toggleMute,
    seekTo,
  }
}
