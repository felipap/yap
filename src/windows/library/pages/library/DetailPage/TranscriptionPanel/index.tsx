import { useRef, useState } from 'react'
import { CopyIcon, RefreshIcon } from '~/shared/icons'
import { withBoundary } from '~/shared/withBoundary'
import { EnrichedLog } from '../../../../types'
import { PlayerRef } from '../Player'
import { Teleprompter } from './Teleprompter'
import { TranscribeButton } from './TranscribeButton'
import { useTranscriptionState } from './useTranscriptionState'

interface Props {
  log: EnrichedLog
  logId: string
  playerRef: React.RefObject<PlayerRef>
}

export const TranscriptionPanel = withBoundary(function ({
  log,
  logId,
  playerRef,
}: Props) {
  const {
    transcription,
    isTranscribing,
    transcriptionError,
    progress,
    progressLabel,
    transcribe,
  } = useTranscriptionState({ logId })

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const teleprompterRef = useRef<{ syncToVideo: () => void }>(null)

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

  if (transcriptionError) {
    return (
      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
        {transcriptionError}
      </div>
    )
  }

  if (!transcription) {
    return (
      <div className="flex justify-between items-center">
        <div className="text-md font-medium text-contrast">Transcript</div>
        <TranscribeButton
          logId={logId}
          useExternal
          isTranscribing={isTranscribing}
          progress={progress}
          progressLabel={progressLabel}
          hasTranscription={!!transcription}
          onClick={transcribe}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex justify-between items-center">
        <div className="text-md font-medium text-contrast">Transcript</div>
        <div className="flex items-center gap-3 -mt-1 mr-1">
          {!isTranscribing && (
            <button
              onClick={transcribe}
              className="text-xs text-contrast/40 hover:text-contrast/70 transition-colors flex items-center gap-1"
              title="Regenerate transcript"
            >
              <RefreshIcon className="w-3 h-3" />
              Redo
            </button>
          )}
          <button
            onClick={handleCopyTranscript}
            className="text-xs text-contrast/40 hover:text-contrast/70 transition-colors flex items-center gap-1"
            title={copyStatus === 'copied' ? 'Copied!' : 'Copy transcript'}
          >
            <CopyIcon className="w-2.5 h-3" />
            {copyStatus === 'copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </header>
      <Teleprompter
        ref={teleprompterRef}
        isVideo={!log.isAudioOnly}
        transcription={transcription}
        playerRef={playerRef}
      />
    </div>
  )
})
