import { RefObject, useEffect, useRef, useState } from 'react'
import { MdReplay } from 'react-icons/md'
import { twMerge } from 'tailwind-merge'
import {
  FullscreenExitIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
} from '~/shared/icons'
import { SeekBar } from './SeekBar'
import { useAutoHideControls } from './useAutoHideControls'
import { useVideoActions, useVideoState } from './useVideoState'
import { formatTime } from './utils'
import { VolumeControl } from './VolumeControl'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  className?: string
  canFullscreen: boolean
  onBackgroundClick?: () => void
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return isFullscreen
}

function useArrowKeySeek(
  videoRef: RefObject<HTMLVideoElement>,
  skipBackward: () => void,
  skipForward: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        skipBackward()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        skipForward()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [videoRef, skipBackward, skipForward])
}

// Note: Even though PlaybackPreferencesProvider exists, we're changing the state
// of the video element directly here. This is cleaner because VideoControls doesn't
// have to know about how we wire the rest of the app. The Player component
// (../index.tsx) catches changes to the video element (e.g., muting, playback speed)
// via event listeners and syncs them to the global preference state.
export function VideoControls({
  videoRef,
  className,
  canFullscreen,
  onBackgroundClick,
}: Props) {
  const controlsRef = useRef<HTMLDivElement>(null)
  const [isDraggingSeek, setIsDraggingSeek] = useState(false)

  const {
    isPlaying,
    currentTime,
    duration,
    bufferedRanges,
    isMuted,
    playbackSpeed,
  } = useVideoState(videoRef, isDraggingSeek)

  const {
    togglePlay,
    skipBackward,
    skipForward,
    cycleSpeed,
    toggleMute,
    seekTo,
  } = useVideoActions(videoRef, duration, playbackSpeed)

  const showControls = useAutoHideControls(controlsRef, isPlaying)
  const isFullscreen = useFullscreen()

  useArrowKeySeek(videoRef, skipBackward, skipForward)

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

  return (
    <div
      ref={controlsRef}
      className={twMerge(
        'absolute bottom-0 top-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/60 to-black/10 transition-opacity duration-300 rounded-md',
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}
    >
      {/* Clickable area for play/pause toggle */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onBackgroundClick}
      />
      <div className="absolute bottom-0 left-0 right-0 p-3 pb-3">
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          bufferedRanges={bufferedRanges}
          onSeek={seekTo}
          onSeekStart={() => setIsDraggingSeek(true)}
          onSeekEnd={() => setIsDraggingSeek(false)}
        />

        {/* Controls Row */}
        <div className="flex items-center gap-3 text-white">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="hover:scale-110 transition-transform outline-none"
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
            <MdReplay size={20} />
          </button>

          {/* Skip Forward */}
          <button
            onClick={skipForward}
            className="hover:-scale-x-110 transition-transform -scale-x-100"
            title="Skip forward 10s"
          >
            <MdReplay size={20} />
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
            {canFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="hover:scale-110 transition-transform"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
