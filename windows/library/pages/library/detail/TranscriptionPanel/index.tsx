import { useState } from 'react'
import { withBoundary } from '../../../../../shared/withBoundary'
import { EnrichedLog } from '../../../../types'
import { PlayerRef } from '../Player'
import { Teleprompter } from './Teleprompter'
import { TranscribeButton } from './TranscribeButton'
import { useTranscriptionState } from './useTranscriptionState'

interface Props {
  log: EnrichedLog
  vlogId: string
  playerRef: React.RefObject<PlayerRef>
}

export const TranscriptionPanel = withBoundary(function ({
  log,
  vlogId,
  playerRef,
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
    <div className="bg-two rounded-lg p-3 border w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-[15px] font-medium text-contrast m-0">
          Transcript
        </h3>

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
        <div className="mb-3 text-red-400 text-sm">{transcriptionError}</div>
      )}

      {!transcription && !isTranscribing && (
        <div className="text-sm text-secondary/80">
          No transcript yet. Click "Transcribe" to generate one.
        </div>
      )}

      {transcription && (
        <Teleprompter
          isVideo={!log.isAudioOnly}
          transcription={transcription}
          playerRef={playerRef}
        />
      )}
    </div>
  )
})
