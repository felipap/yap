import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { twMerge } from 'tailwind-merge'
import { usePlaybackPreferences } from '../../../../../shared/PlaybackPreferencesProvider'
import { withBoundary } from '../../../../../shared/withBoundary'
import { PlaybackActionsOverlay } from './PlaybackActionsOverlay'
import { useRememberMediaPosition } from './useRememberMediaPosition'
import { VideoControls } from './VideoControls'

interface Props {
  logId: string
  src: string
  className?: string
  autoPlay?: boolean
  onLoadedData?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onSeeked?: (currentTime: number) => void
}

export interface PlayerRef {
  currentTime: number
  paused: boolean
  play: () => Promise<void>
  pause: () => void
  seekTo: (time: number) => void
}

export const Player = withBoundary(
  forwardRef<PlayerRef, Props>(
    (
      {
        logId,
        src,
        className = 'w-full max-w-4xl h-auto rounded-lg shadow-lg',
        autoPlay = true,
        onLoadedData,
        onTimeUpdate,
        onSeeked,
      },
      ref,
    ) => {
      const videoRef = useRef<HTMLVideoElement>(null)
      const [isBuffering, setIsBuffering] = useState(false)
      const [isFullscreen, setIsFullscreen] = useState(false)
      const { isMuted, toggleMute, setMuted, playbackSpeed, setPlaybackSpeed } =
        usePlaybackPreferences()

      // Use the hook to handle position restoration and saving
      useRememberMediaPosition({
        videoRef,
        vlogId: logId,
        onTimeUpdate,
        onSeeked,
        onLoadedData,
      })

      // Expose video methods through ref
      useImperativeHandle(
        ref,
        () => ({
          get currentTime() {
            return videoRef.current?.currentTime || 0
          },
          get paused() {
            return videoRef.current?.paused ?? true
          },
          play: async () => {
            if (videoRef.current) {
              await videoRef.current.play()
            }
          },
          pause: () => {
            if (videoRef.current) {
              videoRef.current.pause()
            }
          },
          seekTo: (time: number) => {
            console.log('seekTo', time)
            if (videoRef.current) {
              videoRef.current.currentTime = time
            }
          },
        }),
        [],
      )

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

      // Handle buffering state
      useEffect(() => {
        const video = videoRef.current
        if (!video) {
          return
        }

        const handleWaiting = () => {
          setIsBuffering(true)
        }

        const handleCanPlay = () => {
          setIsBuffering(false)
        }

        const handleLoadStart = () => {
          setIsBuffering(true)
        }

        const handleLoadedData = () => {
          setIsBuffering(false)
        }

        video.addEventListener('waiting', handleWaiting)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('loadstart', handleLoadStart)
        video.addEventListener('loadeddata', handleLoadedData)

        return () => {
          video.removeEventListener('waiting', handleWaiting)
          video.removeEventListener('canplay', handleCanPlay)
          video.removeEventListener('loadstart', handleLoadStart)
          video.removeEventListener('loadeddata', handleLoadedData)
        }
      }, [])

      // Handle fullscreen changes
      useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)

        return () => {
          document.removeEventListener(
            'fullscreenchange',
            handleFullscreenChange,
          )
        }
      }, [])

      const handleVideoClick = () => {
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play()
          } else {
            videoRef.current.pause()
          }
        }
      }

      return (
        <div
          className={twMerge('relative group', isFullscreen && 'w-full h-full')}
        >
          <video
            ref={videoRef}
            controls={false}
            autoPlay={autoPlay}
            muted={isMuted}
            className={twMerge(
              isBuffering
                ? 'w-full h-auto rounded-lg shadow-lg opacity-50'
                : 'opacity-100',
              className,
              'cursor-pointer',
              isFullscreen ? 'w-full h-full object-contain' : 'object-cover',
            )}
            src={src}
            onClick={handleVideoClick}
          >
            Your browser does not support the video tag.
          </video>
          <PlaybackActionsOverlay logId={logId} />
          <VideoControls videoRef={videoRef} />
        </div>
      )
    },
  ),
)

Player.displayName = 'Video'
