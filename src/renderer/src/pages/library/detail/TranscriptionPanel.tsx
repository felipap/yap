import { useEffect, useState } from 'react'
import { getTranscription, transcribeVideo } from '../../../ipc'
import { withBoundary } from '../../../shared/withBoundary'
import { TranscriptionResult } from '../../../types'

interface Props {
  vlogId: string
  videoRef: React.RefObject<HTMLVideoElement>
}

export const TranscriptionPanel = withBoundary(function ({
  vlogId,
  videoRef,
}: Props) {
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showTranscription, setShowTranscription] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  )

  // Load existing transcription on mount
  useEffect(() => {
    const loadTranscription = async () => {
      try {
        const existingTranscription = await getTranscription(vlogId)
        if (existingTranscription) {
          setTranscription(existingTranscription)
          setShowTranscription(true) // Automatically show if transcription exists
        }
      } catch (error) {
        console.error('Failed to load transcription:', error)
      }
    }

    loadTranscription()
  }, [vlogId])

  const handleTranscribe = async () => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const result = await transcribeVideo(vlogId)
      setTranscription(result)
      setShowTranscription(true)
    } catch (error) {
      console.error('Transcription failed:', error)
      setTranscriptionError(
        error instanceof Error ? error.message : 'Transcription failed',
      )
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSegmentClick = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime
    }
  }

  return (
    <>
      {/* Transcription button */}
      {transcription ? (
        <button
          className="btn-secondary"
          onClick={() => setShowTranscription(!showTranscription)}
        >
          {showTranscription ? '📝 Hide Transcript' : '📝 Show Transcript'}
        </button>
      ) : (
        <button
          className="btn-primary"
          onClick={handleTranscribe}
          disabled={isTranscribing}
        >
          {isTranscribing ? '⏳ Transcribing...' : '🎤 Transcribe'}
        </button>
      )}

      {/* Transcription panel */}
      {showTranscription && transcription && (
        <div className="bg-two rounded-lg p-4 border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0">
              Transcript
            </h3>
            <button
              onClick={() => setShowTranscription(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>

          <div className="">
            {transcription.segments.map((segment, index) => (
              <div
                key={index}
                className="p-2 rounded cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => handleSegmentClick(segment.start)}
              >
                <div className="text-xs text-[var(--text-secondary)] mb-1">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </div>
                <div className="text-sm text-[var(--text-primary)]">
                  {segment.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {transcriptionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <span>{transcriptionError}</span>
            <button
              onClick={() => setTranscriptionError(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
})
