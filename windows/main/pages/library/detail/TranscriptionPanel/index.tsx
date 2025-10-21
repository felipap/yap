import { useState } from 'react'
import { withBoundary } from '../../../../../shared/withBoundary'
import { VideoRef } from '../Video'
import { Teleprompter } from './Teleprompter'
import { TranscribeButton } from './TranscribeButton'
import { useTranscriptionState } from './useTranscriptionState'

interface Props {
  vlogId: string
  videoRef: React.RefObject<VideoRef>
}

export const TranscriptionPanel = withBoundary(function ({
  vlogId,
  videoRef,
}: Props) {
  const {
    transcription,
    isTranscribing,
    transcriptionError,
    progress,
    progressLabel,
    transcribe,
  } = useTranscriptionState({ vlogId })

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const handleCopyTranscript = async () => {
    if (!transcription) {
      return
    }

    try {
      await navigator.clipboard.writeText(transcription.text)
      setCopyStatus('copied')
      setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Failed to copy transcript:', error)
    }
  }

  return (
    <div className="bg-two rounded-lg p-4 border w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-contrast m-0">Transcript</h3>

        <div className="flex items-center gap-2">
          {transcription && (
            <button
              onClick={handleCopyTranscript}
              className="btn-secondary text-sm"
              title="Copy transcript to clipboard"
            >
              {copyStatus === 'copied' ? '✓ Copied' : '📋 Copy'}
            </button>
          )}
          <TranscribeButton
            vlogId={vlogId}
            useExternal
            isTranscribing={isTranscribing}
            progress={progress}
            progressLabel={progressLabel}
            hasTranscription={!!transcription}
            onClick={transcribe}
          />
        </div>
      </div>

      {transcriptionError && (
        <div className="mb-3 text-[var(--text-danger)] text-sm">
          {transcriptionError}
        </div>
      )}

      {!transcription && !isTranscribing && (
        <div className="text-sm text-[var(--text-secondary)]">
          No transcript yet. Click "Transcribe" to generate one.
        </div>
      )}

      {transcription && (
        <Teleprompter transcription={transcription} videoRef={videoRef} />
      )}
    </div>
  )
})
