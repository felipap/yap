import { useEffect, useState, useRef, RefObject } from 'react'
import { twMerge } from 'tailwind-merge'
import { MdForward10, MdReplay10 } from 'react-icons/md'
import { usePlaybackPreferences } from '../../../../../../shared/PlaybackPreferencesProvider'
import { VolumeControl } from './VolumeControl'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  className?: string
}

export function VideoControls({ videoRef, className }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDraggingSeek, setIsDraggingSeek] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null)

  const controlsRef = useRef<HTMLDivElement>(null)
  const seekBarRef = useRef<HTMLDivElement>(null)
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null)

  const { isMuted, toggleMute, playbackSpeed, setPlaybackSpeed } =
    usePlaybackPreferences()

  const speeds = [1, 1.25, 1.5, 1.75, 2]

  // Update play state
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }
    const handlePause = () => {
      setIsPlaying(false)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [videoRef])

  // Update time and duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleTimeUpdate = () => {
      if (!isDraggingSeek) {
        setCurrentTime(video.currentTime)
      }
    }

    const handleDurationChange = () => {
      setDuration(video.duration)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleProgress = () => {
      setBufferedRanges(video.buffered)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('progress', handleProgress)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('progress', handleProgress)
    }
  }, [videoRef, isDraggingSeek])

  // Auto-hide controls
  useEffect(() => {
    const video = videoRef.current
    const container = controlsRef.current?.parentElement
    if (!video || !container) {
      return
    }

    const resetHideTimer = () => {
      setShowControls(true)
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current)
      }
      if (isPlaying) {
        hideControlsTimer.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
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
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current)
      }
    }
  }, [videoRef, isPlaying])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setPlaybackSpeed(speeds[nextIndex])
  }

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const seekBar = seekBarRef.current
    if (!video || !seekBar) {
      return
    }

    const rect = seekBar.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    video.currentTime = percent * duration
  }

  const handleSeekBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingSeek(true)
    handleSeekBarClick(e)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const video = videoRef.current
      const seekBar = seekBarRef.current
      if (!video || !seekBar) {
        return
      }

      const rect = seekBar.getBoundingClientRect()
      const percent = Math.max(
        0,
        Math.min(1, (moveEvent.clientX - rect.left) / rect.width),
      )
      const newTime = percent * duration
      setCurrentTime(newTime)
      video.currentTime = newTime
    }

    const handleMouseUp = () => {
      setIsDraggingSeek(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const toggleFullscreen = () => {
    const container = controlsRef.current?.parentElement
    if (!container) {
      return
    }

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) {
      return '0:00'
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBufferedPercent = (): number => {
    if (!bufferedRanges || bufferedRanges.length === 0 || !duration) {
      return 0
    }

    // Find the buffered range that contains the current time
    for (let i = 0; i < bufferedRanges.length; i++) {
      if (
        bufferedRanges.start(i) <= currentTime &&
        currentTime <= bufferedRanges.end(i)
      ) {
        return (bufferedRanges.end(i) / duration) * 100
      }
    }

    // If current time is not in any buffered range, return the last buffered end
    return (bufferedRanges.end(bufferedRanges.length - 1) / duration) * 100
  }

  return (
    <div
      ref={controlsRef}
      className={twMerge(
        'absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/60 to-transparent p-4 transition-opacity duration-300 rounded-md',
        showControls ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {/* Seek Bar */}
      <div className="mb-3">
        <div
          className="relative cursor-pointer py-2 -my-2 group"
          onClick={handleSeekBarClick}
          onMouseDown={handleSeekBarMouseDown}
        >
          <div
            ref={seekBarRef}
            className="relative h-1 bg-white/30 rounded-full pointer-events-none"
          >
            {/* Buffered Progress */}
            <div
              className="absolute h-full bg-white/40 rounded-full pointer-events-none"
              style={{ width: `${getBufferedPercent()}%` }}
            />
            {/* Played Progress */}
            <div
              className="absolute h-full bg-white rounded-full pointer-events-none"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Seek Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                marginLeft: '-6px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-3 text-white">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="hover:scale-110 transition-transform"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip Backward */}
        <button
          onClick={skipBackward}
          className="hover:scale-110 transition-transform"
          title="Skip backward 10s"
        >
          <MdReplay10 size={28} />
        </button>

        {/* Skip Forward */}
        <button
          onClick={skipForward}
          className="hover:scale-110 transition-transform"
          title="Skip forward 10s"
        >
          <MdForward10 size={28} />
        </button>

        {/* Time Display */}
        <div className="text-sm font-medium whitespace-nowrap select-none">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Volume */}
          <VolumeControl
            videoRef={videoRef}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />

          {/* Playback Speed */}
          <button
            onClick={cycleSpeed}
            className="text-sm font-medium px-2 py-1 hover:bg-white/20 rounded transition-colors w-[50px] text-center outline-none"
            title="Cycle playback speed"
          >
            {playbackSpeed}x
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="hover:scale-110 transition-transform"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

// Icons
function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  )
}

function FullscreenExitIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  )
}
