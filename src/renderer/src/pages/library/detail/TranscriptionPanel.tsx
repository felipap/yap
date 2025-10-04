import { useEffect, useState, useRef } from 'react'
import { getTranscription, transcribeVideo } from '../../../ipc'
import { withBoundary } from '../../../shared/withBoundary'
import { TranscriptionResult } from '../../../types'
import { VideoRef } from './Video'

interface Props {
  vlogId: string
  videoRef: React.RefObject<VideoRef>
  onTranscribe?: () => void
  isTranscribing?: boolean
  transcriptionError?: string | null
  transcription?: TranscriptionResult | null
}

export const TranscriptionPanel = withBoundary(function ({
  vlogId,
  videoRef,
  onTranscribe,
  isTranscribing,
  transcriptionError,
  transcription,
}: Props) {
  const [showTranscription, setShowTranscription] = useState(false)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)

  // Show transcription panel when transcription becomes available
  useEffect(() => {
    if (transcription) {
      setShowTranscription(true)
    }
  }, [transcription])

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

  const handleSyncToVideo = () => {
    if (
      !videoRef.current ||
      !transcription ||
      !transcriptContainerRef.current
    ) {
      return
    }

    const currentTime = videoRef.current.currentTime

    // Find the segment that contains the current time
    const currentSegment = transcription.segments.find(
      (segment) => currentTime >= segment.start && currentTime <= segment.end,
    )

    if (currentSegment) {
      // Find the index of the current segment
      const segmentIndex = transcription.segments.findIndex(
        (segment) => segment === currentSegment,
      )

      // Scroll to the segment
      const segmentElement = transcriptContainerRef.current.children[
        segmentIndex
      ] as HTMLElement
      if (segmentElement) {
        segmentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        // Add a temporary highlight
        segmentElement.style.backgroundColor = 'var(--bg-hover)'
        setTimeout(() => {
          segmentElement.style.backgroundColor = ''
        }, 2000)
      }
    }
  }

  if (!transcription) {
    return null
  }

  return (
    <>
      {/* Transcription panel */}
      {showTranscription && transcription && (
        <div className="bg-two rounded-lg p-4 border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-contrast m-0">
              Transcript
            </h3>
            <button
              onClick={handleSyncToVideo}
              className="btn-secondary text-sm"
              title="Sync transcript to current video position"
            >
              ⏯️ Sync to Video
            </button>
            <button
              onClick={() => setShowTranscription(false)}
              className="text-[var(--text-secondary)] hover:text-contrast"
            >
              ✕
            </button>
          </div>

          <div
            className="h-[400px] overflow-y-auto"
            ref={transcriptContainerRef}
          >
            {transcription.segments.map((segment, index) => (
              <div
                key={index}
                className="p-2 rounded cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSegmentClick(segment.start)}
              >
                <div className="text-xs text-[var(--text-secondary)] mb-1">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </div>
                <div className="text-sm text-contrast">{segment.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
})
