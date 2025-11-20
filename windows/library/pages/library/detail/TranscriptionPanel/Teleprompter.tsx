import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { TranscriptionResult } from '../../../../types'
import { PlayerRef } from '../Player'
import { twMerge } from 'tailwind-merge'

interface TeleprompterProps {
  isVideo: boolean
  transcription: TranscriptionResult
  playerRef: React.RefObject<PlayerRef>
}

export interface TeleprompterRef {
  syncToVideo: () => void
}

export const Teleprompter = forwardRef<TeleprompterRef, TeleprompterProps>(
  function Teleprompter({ isVideo, transcription, playerRef }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(
      null,
    )
    const previousActiveIndexRef = useRef<number | null>(null)

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSegmentClick = (startTime: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(startTime)
      }
    }

    const syncToVideo = useCallback(() => {
      if (
        !playerRef.current ||
        !containerRef.current ||
        !transcription.segments
      ) {
        return
      }

      // Don't sync if video is paused
      if (playerRef.current.paused) {
        return
      }

      const currentTime = playerRef.current.currentTime

      const currentSegment = transcription.segments.find(
        (segment: TranscriptionResult['segments'][number]) =>
          currentTime >= segment.start && currentTime <= segment.end,
      )

      if (!currentSegment) {
        return
      }

      const segmentIndex = transcription.segments.findIndex(
        (segment: TranscriptionResult['segments'][number]) =>
          segment === currentSegment,
      )

      // Update active segment index if it changed
      if (segmentIndex !== previousActiveIndexRef.current) {
        previousActiveIndexRef.current = segmentIndex
        setActiveSegmentIndex(segmentIndex)
      }

      const segmentElement = containerRef.current.children[segmentIndex] as
        | HTMLElement
        | undefined
      if (!segmentElement) {
        return
      }

      // Scroll within the container only, not the entire page
      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = segmentElement.getBoundingClientRect()

      // Calculate the position relative to the container
      const elementTop =
        elementRect.top - containerRect.top + container.scrollTop
      const elementHeight = segmentElement.offsetHeight
      const containerHeight = container.clientHeight

      // Center the element in the container
      const scrollPosition =
        elementTop - containerHeight / 2 + elementHeight / 2

      // Fast scrolling - set scrollTop directly for immediate scrolling
      container.scrollTop = scrollPosition
    }, [playerRef, transcription.segments])

    useImperativeHandle(ref, () => ({
      syncToVideo,
    }))

    // Automatically sync to video as it plays
    useEffect(() => {
      const interval = setInterval(() => {
        syncToVideo()
      }, 500) // Check every 100ms

      return () => {
        clearInterval(interval)
      }
    }, [syncToVideo])

    return (
      <div className="flex flex-col gap-3 p-1 pb-0">
        <div
          className="h-[300px] overflow-y-auto border-t dark:border-white/10"
          ref={containerRef}
        >
          <div className="h-[5px]"></div>
          {transcription.segments?.map(
            (
              segment: TranscriptionResult['segments'][number],
              index: number,
            ) => (
              <div
                key={index}
                className={twMerge(
                  'p-2 rounded cursor-pointer mb-1 transition-colors leading-[1.1]',
                  activeSegmentIndex === index
                    ? 'bg-black/5 dark:bg-white/5'
                    : 'hover:bg-black/5 dark:hover:bg-white/5',
                )}
                onClick={() => handleSegmentClick(segment.start)}
              >
                <div className="text-xs text-secondary mb-1">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </div>
                <div className="text-sm text-contrast">{segment.text}</div>
              </div>
            ),
          )}
          <div className="h-[10px]"></div>
        </div>
      </div>
    )
  },
)
