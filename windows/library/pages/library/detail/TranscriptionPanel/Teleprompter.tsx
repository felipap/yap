import { useRef } from 'react'
import { TranscriptionResult } from '../../../../types'
import { PlayerRef } from '../Player'

interface TeleprompterProps {
  isVideo: boolean
  transcription: TranscriptionResult
  playerRef: React.RefObject<PlayerRef>
}

export function Teleprompter({
  isVideo,
  transcription,
  playerRef,
}: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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

  const syncToVideo = () => {
    if (!playerRef.current || !containerRef.current) {
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

    const segmentElement = containerRef.current.children[segmentIndex] as
      | HTMLElement
      | undefined
    if (!segmentElement) {
      return
    }

    segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    segmentElement.style.backgroundColor = 'var(--bg-hover)'
    setTimeout(() => {
      segmentElement.style.backgroundColor = ''
    }, 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={syncToVideo}
          className="btn-secondary text-sm font-medium"
          title="Sync transcript to current video position"
        >
          ⏯Sync to {isVideo ? 'video' : 'audio'}
        </button>
      </div>

      <div className="h-[400px] overflow-y-auto" ref={containerRef}>
        {transcription.segments.map(
          (segment: TranscriptionResult['segments'][number], index: number) => (
            <div
              key={index}
              className="p-2 rounded cursor-pointer hover:bg-hover transition-colors"
              onClick={() => handleSegmentClick(segment.start)}
            >
              <div className="text-xs textsecondary mb-1">
                {formatTime(segment.start)} - {formatTime(segment.end)}
              </div>
              <div className="text-sm text-contrast">{segment.text}</div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
