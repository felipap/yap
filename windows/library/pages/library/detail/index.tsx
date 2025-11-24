import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { onViewLogEntry } from '../../../../shared/ipc'
import { withBoundary } from '../../../../shared/withBoundary'
import { EnrichedLog } from '../../../types'
import { MissingFileDetailPage } from './MissingFileDetailPage'
import { Player, PlayerRef } from './Player'
import { SummarySubtitle } from './SummarySubtitle'
import { TitleInput } from './TitleInput'
import { Toolbar } from './Toolbar'
import { TranscriptionPanel } from './TranscriptionPanel'
import { usePlayerShortcuts } from './usePlayerShortcuts'
import { PlaybackPreferencesProvider } from '../../../../shared/PlaybackPreferencesProvider'

interface Props {
  log: EnrichedLog
  onBack: () => void
}

export const DetailPage = withBoundary(function ({ log, onBack }: Props) {
  const playerRef = useRef<PlayerRef | null>(null)

  // Notify backend when viewing this log entry
  useEffect(() => {
    onViewLogEntry(log.id)
  }, [log.id])

  usePlayerShortcuts({ playerRef })

  const isMissing = !log.fileExists
  if (isMissing) {
    return <MissingFileDetailPage log={log} onBack={onBack} />
  }

  return (
    <div
      className={twMerge(
        'gap-7 overflow-x-hidden overflow-y-scroll w-full pb-8',
      )}
    >
      <div className="w-full px-1">
        <Player
          ref={playerRef}
          logId={log.id}
          isVideo={!log.isAudioOnly}
          src={`log-media://${log.id}`}
          className={twMerge(
            'w-full rounded-md',
            log.isAudioOnly ? 'max-h-[100px]' : 'h-[350px]',
          )}
        />
      </div>
      <div className="flex flex-col items-center gap-8 justify-start mt-5">
        <header className="px-0 flex flex-col gap-1 w-full">
          <TitleInput
            logId={log.id}
            isVideo={!log.isAudioOnly}
            title={log.title || ''}
          />
          <div className="px-1.5">
            <SummarySubtitle log={log} />
          </div>
        </header>

        <div className="px-1 flex flex-col gap-4 w-full">
          <TranscriptionPanel log={log} logId={log.id} playerRef={playerRef} />
        </div>

        <div className="px-1 w-full">
          <Toolbar log={log} onBack={onBack} />
        </div>
      </div>
    </div>
  )
})
