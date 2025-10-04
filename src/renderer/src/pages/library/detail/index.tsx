import { useEffect, useRef, useState } from 'react'
import { openFileLocation, untrackVlog } from '../../../ipc'
import { withBoundary } from '../../../shared/withBoundary'
import { RecordedFile, TranscriptionResult } from '../../../types'
import { TranscriptionPanel } from './TranscriptionPanel'
import { Video, VideoRef } from './Video'
import { Summary } from './Summary'
import { TranscribeButton } from './transcription/TranscribeButton'
import { useTranscriptionState } from './transcription/useTranscriptionState'
import { useVideoShortcuts } from './useVideoShortcuts'

interface InnerProps {
  vlog: RecordedFile
  onBack: () => void
}

export const DetailPage = withBoundary(function ({ vlog, onBack }: InnerProps) {
  const videoRef = useRef<VideoRef>(null)
  const [currentVlog, setCurrentVlog] = useState<RecordedFile>(vlog)
  const [showTranscription, setShowTranscription] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    transcription,
    isTranscribing,
    transcriptionError,
    hasTranscription,
    transcribe,
    clearError,
  } = useTranscriptionState({ vlogId: currentVlog.id })

  useVideoShortcuts({ videoRef })

  // Listen for summary-generated events
  useEffect(() => {
    const handleSummaryGenerated = async (vlogId: string, summary: string) => {
      console.log(`Received summary-generated event for vlog ${vlogId}`)
      if (vlogId === currentVlog.id) {
        console.log(`Updating summary for current vlog ${currentVlog.id}`)
        // Update the current vlog with the new summary
        setCurrentVlog((prev) => ({ ...prev, summary }))
      }
    }

    // Listen for the summary-generated event from the main process
    if (window.electronAPI.onSummaryGenerated) {
      window.electronAPI.onSummaryGenerated(handleSummaryGenerated)
    }

    return () => {
      // Cleanup listener if needed
      if (window.electronAPI.removeSummaryGeneratedListener) {
        window.electronAPI.removeSummaryGeneratedListener(
          handleSummaryGenerated,
        )
      }
    }
  }, [currentVlog.id])

  const handleTranscriptionComplete = (transcription: TranscriptionResult) => {
    // This will be called by TranscribeButton when transcription completes
    // The transcription state is already managed by the hook
  }

  const handleVlogUpdate = (updatedVlog: any) => {
    setCurrentVlog(updatedVlog)
  }

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(currentVlog.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to remove "${currentVlog.name}" from your library? The file will remain on your computer.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await untrackVlog(currentVlog.id)
      onBack()
    } catch (error) {
      console.error('Failed to remove vlog from library:', error)
      alert('Failed to remove vlog from library')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-screen bg-one overflow-scroll py-4">
      <main className="flex flex-col items-center gap-4 justify-start px-4 bg-one min-h-screen">
        <div className="w-full max-w-5xl">
          <Video
            ref={videoRef}
            vlogId={currentVlog.id}
            src={`vlog-video://${currentVlog.id}`}
          />
        </div>

        <header className="flex flex-row items-center justify-between w-full">
          <div />
          <div className="no-drag-region flex gap-3">
            <TranscribeButton
              vlogId={currentVlog.id}
              onTranscriptionComplete={handleTranscriptionComplete}
              onVlogUpdate={handleVlogUpdate}
              disabled={isDeleting}
            />

            {transcription && (
              <HeaderButton
                onClick={() => setShowTranscription(!showTranscription)}
              >
                {showTranscription
                  ? '📝 Hide Transcript'
                  : '📝 Show Transcript'}
              </HeaderButton>
            )}

            <HeaderButton onClick={handleOpenLocation} disabled={isDeleting}>
              📁 Show in Finder
            </HeaderButton>
            <HeaderButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '⏳ Removing...' : '🗑️ Remove'}
            </HeaderButton>
          </div>
        </header>

        <div className="flex flex-col gap-4 w-full">
          <Summary vlog={currentVlog} transcription={transcription?.text} />
        </div>

        {showTranscription && (
          <div className="flex flex-col gap-4 w-full">
            <TranscriptionPanel
              vlogId={currentVlog.id}
              videoRef={videoRef}
              onTranscribe={transcribe}
              isTranscribing={isTranscribing}
              transcriptionError={transcriptionError}
              transcription={transcription}
            />
          </div>
        )}
      </main>
    </div>
  )
})

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
