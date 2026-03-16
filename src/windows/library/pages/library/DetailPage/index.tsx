import { useEffect, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { onViewLogEntry } from '~/shared/ipc'
import { PlaybackPreferencesProvider } from '~/shared/PlaybackPreferencesProvider'
import { withBoundary } from '~/shared/withBoundary'
import { EnrichedLog } from '../../../types'
import { Toolbar } from './Toolbar'
import { MissingFileDetailPage } from './MissingFileDetailPage'
import { Player, PlayerRef } from './Player'
import { SummarySubtitle } from './SummarySubtitle'
import { TitleInput } from './TitleInput'
import { TranscriptionPanel } from './TranscriptionPanel'
import { usePlayerShortcuts } from './usePlayerShortcuts'
import { DebugToolbar } from './DebugToolbar'

interface Props {
  log: EnrichedLog
  unselect: () => void
}

export const DetailPage = withBoundary(function ({ log, unselect }: Props) {
  const isMissing = !log.fileExists
  if (isMissing) {
    return <MissingFileDetailPage log={log} unselect={unselect} />
  }

  return (
    <PlaybackPreferencesProvider>
      <DetailPageInner log={log} unselect={unselect} />
    </PlaybackPreferencesProvider>
  )
})

function DetailPageInner({ log, unselect }: Props) {
  const playerRef = useRef<PlayerRef | null>(null)

  useEffect(() => {
    onViewLogEntry(log.id)
  }, [log.id])

  usePlayerShortcuts({ playerRef })

  return (
    <div
      className={twMerge(
        'gap-7 overflow-x-hidden overflow-y-scroll w-full pb-8',
      )}
    >
      <div className="h-(--nav-height) drag-region" />
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
          <div className="flex items-start gap-2 pr-3 pt-2">
            <TitleInput
              logId={log.id}
              isVideo={!log.isAudioOnly}
              title={log.title || ''}
              className="flex-1 min-w-0"
            />
            <div className="-mt-2">
              <Toolbar
                logId={log.id}
                isFavorited={log.isFavorited ?? false}
                isWebmOrMov={
                  log.name?.toLowerCase().endsWith('.webm') ||
                  log.name?.toLowerCase().endsWith('.mov') ||
                  false
                }
                isInDefaultFolder={log.isInDefaultFolder ?? true}
                onDeleted={unselect}
              />
            </div>
          </div>
          <div className="px-1.5">
            <SummarySubtitle log={log} />
          </div>
        </header>

        <div className="px-1 flex flex-col gap-4 w-full">
          <TranscriptionPanel log={log} logId={log.id} playerRef={playerRef} />
        </div>

        <div className="px-1 w-full">
          <DebugToolbar log={log} unselect={unselect} />
        </div>
      </div>
    </div>
  )
}
