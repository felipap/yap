import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { twMerge } from 'tailwind-merge'
import { withBoundary } from '../../../../../shared/withBoundary'
import { PlaybackActionsOverlay } from './PlaybackActionsOverlay'
import { useRememberMediaPosition } from './useRememberMediaPosition'
import { useSyncVideoPlaybackPreferences } from './useSyncVideoPlaybackPreferences'
import { VideoControls } from './VideoControls'

interface Props {
  logId: string
  isVideo: boolean
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
      { logId, isVideo, src, className, onLoadedData, onTimeUpdate, onSeeked },
      ref,
    ) => {
      const videoRef = useRef<HTMLVideoElement>(null)
      const [isBuffering, setIsBuffering] = useState(false)
      const [isFullscreen, setIsFullscreen] = useState(false)

      // Use the hook to handle position restoration and saving
      useRememberMediaPosition({
        videoRef,
        logId: logId,
        onTimeUpdate,
        onSeeked,
        onLoadedData,
      })

      // Sync video playback preferences with global state
      useSyncVideoPlaybackPreferences({ videoRef })

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
            if (videoRef.current) {
              videoRef.current.currentTime = time
            }
          },
        }),
        [],
      )

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
          className={twMerge(
            'relative group',
            'w-full max-w-4xl h-auto rounded-[13px] overflow-hidden',
            className,
            isFullscreen && 'w-full h-full',
          )}
        >
          <video
            ref={videoRef}
            controls={false}
            // autoPlay
            className={twMerge(
              'w-full h-full',
              isBuffering ? 'opacity-50' : 'opacity-100',
              // For audio, show background, otherwise it's weird.
              !isVideo && 'bg-neutral-500/60',
              'bg-neutral-500/60',
              'cursor-pointer',
              isFullscreen ? 'object-contain' : 'object-cover',
            )}
            src={src}
            onClick={handleVideoClick}
          >
            Your browser does not support the video tag.
          </video>
          <PlaybackActionsOverlay logId={logId} />
          <VideoControls
            videoRef={videoRef}
            canFullscreen={isVideo}
            onBackgroundClick={handleVideoClick}
          />
        </div>
      )
    },
  ),
)

Player.displayName = 'Video'
