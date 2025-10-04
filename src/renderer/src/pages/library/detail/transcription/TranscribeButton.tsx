import { getVlog } from '../../../../ipc'
import { useTranscriptionState } from './useTranscriptionState'

interface TranscribeButtonProps {
  vlogId: string
  onTranscriptionComplete?: (transcription: any) => void
  onVlogUpdate?: (vlog: any) => void
  className?: string
  disabled?: boolean
}

export function TranscribeButton({
  vlogId,
  onTranscriptionComplete,
  onVlogUpdate,
  className = 'btn-secondary text-nowrap text-[12px] rounded-md border hover:opacity-80 transition-opacity bg-two h-7 px-2',
  disabled = false,
}: TranscribeButtonProps) {
  const {
    transcription,
    isTranscribing,
    transcriptionError,
    hasTranscription,
    progress,
    progressLabel,
    transcribe,
    clearError,
  } = useTranscriptionState({ vlogId })

  const handleTranscribe = async () => {
    await transcribe()

    if (transcription) {
      onTranscriptionComplete?.(transcription)

      // Refresh vlog data to get any updates (like summary)
      const updatedVlog = await getVlog(vlogId)
      onVlogUpdate?.(updatedVlog)
    }
  }

  // Don't render if transcription already exists
  if (hasTranscription) {
    return null
  }

  return (
    <>
      <button
        onClick={handleTranscribe}
        disabled={isTranscribing || disabled}
        className={className}
      >
        {isTranscribing ? (
          <div className="flex items-center gap-2">
            <span>⏳ {progressLabel}</span>
            <span className="text-xs opacity-75">{progress}%</span>
          </div>
        ) : (
          '🎤 Transcribe'
        )}
      </button>

      {/* Error message */}
      {transcriptionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <span>{transcriptionError}</span>
            <button
              onClick={clearError}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
