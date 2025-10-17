import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { getVideoPosition, saveVideoPosition } from '../../../../ipc'
import { usePlaybackPreferences } from '../../../../shared/PlaybackPreferencesProvider'
import { withBoundary } from '../../../../shared/withBoundary'
import { PlaybackActionsOverlay } from './PlaybackActionsOverlay'

interface VideoProps {
  vlogId: string
  src: string
  className?: string
  autoPlay?: boolean
  controls?: boolean
  onLoadedData?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onSeeked?: (currentTime: number) => void
}

export interface VideoRef {
  currentTime: number
  paused: boolean
  play: () => Promise<void>
  pause: () => void
  seekTo: (time: number) => void
}

export const Video = withBoundary(
  forwardRef<VideoRef, VideoProps>(
    (
      {
        vlogId,
        src,
        className = 'w-full max-w-4xl h-auto rounded-lg shadow-lg',
        autoPlay = true,
        controls = true,
        onLoadedData,
        onTimeUpdate,
        onSeeked,
      },
      ref,
    ) => {
      const videoRef = useRef<HTMLVideoElement>(null)
      const [hasRestoredPosition, setHasRestoredPosition] = useState(false)
      const [isBuffering, setIsBuffering] = useState(false)
      const { isMuted, toggleMute, setMuted, playbackSpeed, setPlaybackSpeed } =
        usePlaybackPreferences()

      // Expose video methods through ref
      useImperativeHandle(
        ref,
        () => ({
          get currentTime() {
            return videoRef.current?.currentTime || 0
          },
          get paused() {
            return videoRef.current?.paused || true
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

      // Reset restoration state when vlogId changes
      useEffect(() => {
        setHasRestoredPosition(false)
      }, [vlogId])

      // Restore video position on load
      useEffect(() => {
        const restorePosition = async () => {
          if (!videoRef.current || hasRestoredPosition) {
            return
          }

          try {
            const positionData = await getVideoPosition(vlogId)
            if (positionData && videoRef.current) {
              videoRef.current.currentTime = positionData.position
              setHasRestoredPosition(true)
            }
          } catch (error) {
            console.error('Failed to restore video position:', error)
          }
        }

        // Wait for video to be ready
        const video = videoRef.current
        if (video) {
          if (video.readyState >= 2) {
            // HAVE_CURRENT_DATA
            restorePosition()
          } else {
            const handleLoadedData = () => {
              restorePosition()
              video.removeEventListener('loadeddata', handleLoadedData)
            }
            video.addEventListener('loadeddata', handleLoadedData)
            return () =>
              video.removeEventListener('loadeddata', handleLoadedData)
          }
        }
      }, [vlogId, hasRestoredPosition])

      // Track video position changes
      useEffect(() => {
        const video = videoRef.current
        if (!video) {
          return
        }

        let saveTimeout: NodeJS.Timeout

        const handleTimeUpdate = () => {
          // Clear existing timeout
          if (saveTimeout) {
            clearTimeout(saveTimeout)
          }

          // Save position after 2 seconds of no changes (debounced)
          saveTimeout = setTimeout(() => {
            if (video.currentTime > 0) {
              saveVideoPosition(vlogId, video.currentTime).catch(
                (error: unknown) => {
                  console.error('Failed to save video position:', error)
                },
              )
            }
          }, 2000)

          // Call external onTimeUpdate callback
          onTimeUpdate?.(video.currentTime)
        }

        const handleSeeked = () => {
          // Save position immediately when user seeks
          if (video.currentTime > 0) {
            saveVideoPosition(vlogId, video.currentTime).catch(
              (error: unknown) => {
                console.error('Failed to save video position:', error)
              },
            )
          }

          // Call external onSeeked callback
          onSeeked?.(video.currentTime)
        }

        const handleLoadedData = () => {
          onLoadedData?.()
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('loadeddata', handleLoadedData)

        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate)
          video.removeEventListener('seeked', handleSeeked)
          video.removeEventListener('loadeddata', handleLoadedData)
          if (saveTimeout) {
            clearTimeout(saveTimeout)
          }
        }
      }, [vlogId, onTimeUpdate, onSeeked, onLoadedData])

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

      // Determine video className based on buffering state
      const videoClassName = isBuffering
        ? 'w-full max-w-6xl h-auto rounded-lg shadow-lg'
        : className

      return (
        <div className="relative">
          <video
            ref={videoRef}
            controls={controls}
            autoPlay={autoPlay}
            muted={isMuted}
            className={videoClassName}
            src={src}
          >
            Your browser does not support the video tag.
          </video>
          <PlaybackActionsOverlay />
        </div>
      )
    },
  ),
)

Video.displayName = 'Video'
