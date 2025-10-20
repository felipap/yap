import { getVlog } from '../../../../../shared/ipc'

interface TranscribeButtonProps {
  vlogId: string
  onTranscriptionComplete?: (transcription: any) => void
  onVlogUpdate?: (vlog: any) => void
  className?: string
  disabled?: boolean
  useExternal?: boolean
  isTranscribing?: boolean
  progress?: number
  progressLabel?: string
  hasTranscription?: boolean
  onClick?: () => Promise<void> | void
}

export function TranscribeButton({
  vlogId,
  onTranscriptionComplete,
  onVlogUpdate,
  className = 'btn-secondary text-nowrap text-[12px] rounded-md border hover:opacity-80 transition-opacity bg-two h-7 px-2',
  disabled = false,
  useExternal = false,
  isTranscribing,
  progress,
  progressLabel,
  hasTranscription,
  onClick,
}: TranscribeButtonProps) {
  // External mode uses parent-provided state/handlers to avoid duplicate subscriptions
  // Internal mode (default) loads and manages its own state
  const isInternal = !useExternal
  let internalState: any = null
  if (isInternal) {
    // Lazy import to avoid circular deps if any
    const { useTranscriptionState } =
      require('./useTranscriptionState') as typeof import('./useTranscriptionState')
    internalState = useTranscriptionState({ vlogId })
  }

  const computedIsTranscribing = isInternal
    ? internalState.isTranscribing
    : !!isTranscribing
  const computedProgress = isInternal ? internalState.progress : progress
  const computedProgressLabel = isInternal
    ? internalState.progressLabel
    : progressLabel
  const computedHasTranscription = isInternal
    ? internalState.hasTranscription
    : !!hasTranscription
  const computedTranscription = isInternal
    ? internalState.transcription
    : undefined
  const computedClearError = isInternal ? internalState.clearError : undefined
  const computedTranscribe = isInternal ? internalState.transcribe : onClick
  const computedError = isInternal
    ? internalState.transcriptionError
    : undefined

  const handleTranscribe = async () => {
    if (!computedTranscribe) {
      return
    }
    await computedTranscribe()

    if (computedTranscription) {
      onTranscriptionComplete?.(computedTranscription)

      const updatedVlog = await getVlog(vlogId)
      onVlogUpdate?.(updatedVlog)
    }
  }

  // Don't render if transcription already exists
  if (computedHasTranscription) {
    return null
  }

  return (
    <>
      <button
        onClick={handleTranscribe}
        disabled={computedIsTranscribing || disabled}
        className={className}
      >
        {computedIsTranscribing ? (
          <div className="flex items-center gap-2">
            <span>⏳ {computedProgressLabel}</span>
            <span className="text-xs opacity-75">{computedProgress}%</span>
          </div>
        ) : (
          '🎤 Transcribe'
        )}
      </button>

      {/* Error message */}
      {computedError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <span>{computedError}</span>
            <button
              onClick={computedClearError}
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
