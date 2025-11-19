import { useState } from 'react'
import { CopyIcon, RefreshIcon } from '../../../../../shared/icons'
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
    <div className="flex flex-col gap-2">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-contrast">Transcript</div>
          {transcription && (
            <button
              onClick={handleCopyTranscript}
              className="p-1 rounded hover:bg-hover transition-all opacity-60 hover:opacity-100"
              title={
                copyStatus === 'copied'
                  ? 'Copied!'
                  : 'Copy transcript to clipboard'
              }
            >
              <CopyIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {transcription && !isTranscribing && (
            <button
              onClick={transcribe}
              className="btn-primary text-xs font-medium opacity-70 hover:opacity-100 transition-all flex items-center gap-1"
              title="Regenerate transcript"
            >
              <RefreshIcon className="w-3 h-3" />
              Redo
            </button>
          )}
          {isTranscribing && (
            <div className="text-xs text-secondary">
              {progressLabel} {progress > 0 && `(${progress}%)`}
            </div>
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
      </header>

      {transcription ? (
        <div className="text-sm text-contrast border dark:bg-white/5 p-3 rounded-md">
          <Teleprompter
            isVideo={!log.isAudioOnly}
            transcription={transcription}
            playerRef={playerRef}
          />
        </div>
      ) : (
        <div className="p-3 flex items-center justify-center text-text-secondary">
          <div className="text-sm">
            {isTranscribing
              ? 'Transcribing...'
              : "Click 'Transcribe' to generate a transcript"}
          </div>
        </div>
      )}

      {transcriptionError && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
          {transcriptionError}
        </div>
      )}
    </div>
  )
})
