import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { loadVideoDuration } from '../../../../shared/ipc'
import { useVlog } from '../../../../shared/useVlogData'
import { withBoundary } from '../../../../shared/withBoundary'
import { EnrichedLog } from '../../../types'
import { JsonViewer } from './JsonViewer'
import { MissingFileDetailPage } from './MissingFileDetailPage'
import { Player, PlayerRef } from './Player'
import { Summary } from './Summary'
import { TitleInput } from './TitleInput'
import { Toolbar } from './Toolbar'
import { TranscriptionPanel } from './TranscriptionPanel'
import { usePlayerShortcuts } from './usePlayerShortcuts'

interface Props {
  log: EnrichedLog
  onBack: () => void
}

export const DetailPage = withBoundary(function ({
  log: log__,
  onBack,
}: Props) {
  const playerRef = useRef<PlayerRef | null>(null)
  const [log, setCurrentVlog] = useState<EnrichedLog>(log__)
  const [isDeleting, setIsDeleting] = useState(false)

  useMaybeCalculateDurationOnce(log.id)

  usePlayerShortcuts({ playerRef })

  const isMissing = !log.fileExists

  if (isMissing) {
    return <MissingFileDetailPage log={log} onBack={onBack} />
  }

  return (
    <div
      className={twMerge(
        ' gap-4 overflow-x-hidden overflow-y-scroll w-full pb-4',
      )}
    >
      <main className="flex flex-col items-center gap-4 justify-start px-1 bg-one min-h-screen pb-5">
        <div className="w-full max-w-5xl">
          <Player
            ref={playerRef}
            vlogId={log.id}
            src={`log-media://${log.id}`}
            className={twMerge(
              'w-full rounded-md',
              log.isAudioOnly ? 'max-h-[100px]' : 'max-h-[500px]',
            )}
          />
        </div>

        <header className="px-2 flex flex-col gap-3 w-full">
          <TitleInput
            vlogId={log.id}
            title={log.title || ''}
            onLocalTitleChange={(value) =>
              setCurrentVlog((prev) => ({ ...prev, title: value }))
            }
          />
          <Toolbar vlogId={log.id} onBack={onBack} />
        </header>

        <div className="px-2 gap-4 w-full">
          <Summary vlog={log} />
        </div>

        <div className="px-2 flex flex-col gap-4 w-full">
          <TranscriptionPanel log={log} vlogId={log.id} playerRef={playerRef} />
        </div>

        <div className="px-2 w-full">
          <JsonViewer log={log} />
        </div>
      </main>
    </div>
  )
})

// HeaderButton moved into Toolbar

function VideoExtensionTag({ log }: { log: EnrichedLog }) {
  let color = 'bg-blue-100 text-blue-800'
  let inner
  if (log.path.endsWith('.webm')) {
    inner = 'webm'
    color = 'bg-green-100 text-green-800'
  } else if (log.path.endsWith('.mp4')) {
    inner = 'mp4'
    color = 'bg-yellow-100 text-yellow-800'
  } else if (log.path.endsWith('.mov')) {
    inner = 'mov'
    color = 'bg-purple-100 text-purple-800'
  } else {
    return null
  }

  return (
    <span
      className={twMerge(
        'px-2 py-1 text-xs font-medium rounded-md border',
        color,
      )}
    >
      {inner}
    </span>
  )
}

// If the video duration is not known, calculate it once and save it.
function useMaybeCalculateDurationOnce(vlogId: string) {
  const { vlog } = useVlog(vlogId)
  useEffect(() => {
    if (!vlog?.duration) {
      loadVideoDuration(vlogId)
    }
  }, [vlogId, !!vlog])
}
