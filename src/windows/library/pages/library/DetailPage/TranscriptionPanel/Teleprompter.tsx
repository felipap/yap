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
    const [isScrollLocked, setIsScrollLocked] = useState(false)

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSegmentClick = (startTime: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(startTime)
      }
      setIsScrollLocked(true)
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

      // Only auto-scroll if scroll is locked (user clicked a subtitle)
      if (!isScrollLocked) {
        return
      }

      // Scroll the segment into view smoothly
      segmentElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      })
    }, [playerRef, transcription.segments, isScrollLocked])

    useImperativeHandle(ref, () => ({
      syncToVideo,
    }))

    // Unlock scroll when user scrolls manually
    useEffect(() => {
      const container = containerRef.current
      if (!container) {
        return
      }

      // Find the scrollable parent (the detail page scroll container)
      const getScrollParent = (element: HTMLElement): HTMLElement | null => {
        let parent = element.parentElement
        while (parent) {
          const { overflow, overflowY } = getComputedStyle(parent)
          if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
            return parent
          }
          parent = parent.parentElement
        }
        return null
      }

      const scrollParent = getScrollParent(container)
      if (!scrollParent) {
        return
      }

      const handleUserScroll = () => {
        setIsScrollLocked(false)
      }

      // wheel event only fires on user-initiated scrolls (mouse wheel, trackpad)
      scrollParent.addEventListener('wheel', handleUserScroll)
      // touchmove for touch devices
      scrollParent.addEventListener('touchmove', handleUserScroll)

      return () => {
        scrollParent.removeEventListener('wheel', handleUserScroll)
        scrollParent.removeEventListener('touchmove', handleUserScroll)
      }
    }, [])

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
      <div ref={containerRef} className="flex flex-col">
        {transcription.segments?.map(
          (segment: TranscriptionResult['segments'][number], index: number) => (
            <div
              key={index}
              className={twMerge(
                'p-2 -mx-1 rounded cursor-pointer transition leading-[1.1]',
                activeSegmentIndex === index
                  ? 'bg-black/5 dark:bg-white/5'
                  : 'hover:opacity-100 opacity-60 dark:hover:bg-white/5',
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
      </div>
    )
  },
)
