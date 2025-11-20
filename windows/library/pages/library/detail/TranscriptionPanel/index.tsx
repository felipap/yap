import { useRef, useState } from 'react'
import {
  CopyIcon,
  RefreshIcon,
  VisibilityIcon,
} from '../../../../../shared/icons'
import { withBoundary } from '../../../../../shared/withBoundary'
import { EnrichedLog } from '../../../../types'
import { PlayerRef } from '../Player'
import { Teleprompter } from './Teleprompter'
import { TranscribeButton } from './TranscribeButton'
import { useTranscriptionState } from './useTranscriptionState'
import { twMerge } from 'tailwind-merge'

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
  const [isTeleprompterVisible, setIsTeleprompterVisible] = useState(false)
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
      <div className="dark:border-white/5 p-3 justify-between items-center text-contrast border bg-two rounded-md flex gap-0">
        <div className="text-md mr-1 font-smedium track-10 text-contrast">
          Transcript
        </div>
        <div className="flex items-center gap-2">
          <TranscribeButton
            className="bg-one"
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
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-contrast border bg-two rounded-md flex flex-col gap-0">
        <header
          className={twMerge(
            'text-sm flex justify-start gap-2 h-[34px] items-center px-3 flex-row',
            isTeleprompterVisible ? 'pt-1' : 'h-[40px]',
          )}
        >
          <div className="text-md mr-1 font-smedium track-10 text-contrast">
            Transcript
          </div>
          {!isTranscribing && isTeleprompterVisible && (
            <button
              onClick={transcribe}
              className="text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
              title="Regenerate transcript"
            >
              <RefreshIcon className="w-3 h-3" />
              Redo
            </button>
          )}
          <div className="flex-1"></div>
          {!isTeleprompterVisible && (
            <button
              onClick={() => {
                setIsTeleprompterVisible(true)
              }}
              className="text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
              title="Show teleprompter"
            >
              <VisibilityIcon className="w-3 h-3" />
              Show
            </button>
          )}
          {isTeleprompterVisible && (
            <button
              onClick={handleCopyTranscript}
              className="text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
              title={copyStatus === 'copied' ? 'Copied!' : 'Copy transcript'}
            >
              <CopyIcon className="w-2.5 h-3" />
              {copyStatus === 'copied' ? 'Copied' : 'Copy'}
            </button>
          )}
        </header>
        {isTeleprompterVisible && (
          <Teleprompter
            ref={teleprompterRef}
            isVideo={!log.isAudioOnly}
            transcription={transcription}
            playerRef={playerRef}
          />
        )}
      </div>
    </div>
  )
})
