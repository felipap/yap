import { useRef } from 'react'
import { TranscriptionResult } from '../../../../types'
import { VideoRef } from '../Video'

interface TeleprompterProps {
  transcription: TranscriptionResult
  videoRef: React.RefObject<VideoRef>
}

export function Teleprompter({ transcription, videoRef }: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSegmentClick = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(startTime)
    }
  }

  const syncToVideo = () => {
    if (!videoRef.current || !containerRef.current) {
      return
    }

    const currentTime = videoRef.current.currentTime

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
          className="btn-secondary text-sm"
          title="Sync transcript to current video position"
        >
          ⏯️ Sync to Video
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
