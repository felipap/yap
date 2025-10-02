import { useRef, useState, useEffect } from 'react'
import { RecordedFile, TranscriptionResult } from '../../../types'
import { TranscriptionPanel } from './TranscriptionPanel'
import { VideoSummaryPanel } from './VideoSummaryPanel'
import { useVideoShortcuts } from './useVideoShortcuts'
import { getTranscription, transcribeVideo } from '../../../ipc'

interface InnerProps {
  vlog: RecordedFile
  onBack: () => void
  onOpenLocation: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function DetailPage({
  vlog,
  onBack,
  onOpenLocation,
  onDelete,
  isDeleting,
}: InnerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  )
  const [showTranscription, setShowTranscription] = useState(true)

  // Register video shortcuts
  useVideoShortcuts({ videoRef })

  // Load existing transcription on mount
  useEffect(() => {
    const loadTranscription = async () => {
      try {
        const existingTranscription = await getTranscription(vlog.id)
        if (existingTranscription) {
          setTranscription(existingTranscription)
        }
      } catch (error) {
        console.error('Failed to load transcription:', error)
      }
    }

    loadTranscription()
  }, [vlog.id])

  const handleTranscribe = async () => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const result = await transcribeVideo(vlog.id)
      setTranscription(result)
    } catch (error) {
      console.error('Transcription failed:', error)
      setTranscriptionError(
        error instanceof Error ? error.message : 'Transcription failed',
      )
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-screen bg-one overflow-scroll py-4">
      <main className="flex flex-col items-center gap-4 justify-center px-4 bg-one">
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          className="max-w-full max-h-full rounded-lg shadow-lg"
          src={`vlog-video://${vlog.id}`}
        >
          Your browser does not support the video tag.
        </video>

        <header className="flex flex-row items-center justify-between w-full">
          <div />
          <div className="no-drag-region flex gap-3">
            {!transcription && (
              <HeaderButton
                onClick={handleTranscribe}
                disabled={isTranscribing || isDeleting}
              >
                {isTranscribing ? '⏳ Transcribing...' : '🎤 Transcribe'}
              </HeaderButton>
            )}

            {transcription && (
              <HeaderButton
                onClick={() => setShowTranscription(!showTranscription)}
              >
                {showTranscription
                  ? '📝 Hide Transcript'
                  : '📝 Show Transcript'}
              </HeaderButton>
            )}

            <HeaderButton onClick={onOpenLocation} disabled={isDeleting}>
              📁 Show in Finder
            </HeaderButton>
            <HeaderButton onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
            </HeaderButton>
          </div>
        </header>

        <div className="flex flex-col gap-4 w-full">
          <VideoSummaryPanel vlog={vlog} transcription={transcription?.text} />
        </div>

        {showTranscription && (
          <div className="flex flex-col gap-4 w-full">
            <TranscriptionPanel
              vlogId={vlog.id}
              videoRef={videoRef}
              onTranscribe={handleTranscribe}
              isTranscribing={isTranscribing}
              transcriptionError={transcriptionError}
              transcription={transcription}
            />
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
      </main>
    </div>
  )
}

function HeaderButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className="btn-secondary text-nowrap text-[12px] rounded-md border hover:opacity-80 transition-opacity bg-two h-7 px-2"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
