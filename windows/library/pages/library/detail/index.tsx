import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { loadVideoDuration } from '../../../../shared/ipc'
import { useVlog } from '../../../../shared/useVlogData'
import { withBoundary } from '../../../../shared/withBoundary'
import { RecordedFile } from '../../../types'
import { Player, PlayerRef } from './Player'
import { Summary } from './Summary'
import { TitleInput } from './TitleInput'
import { Toolbar } from './Toolbar'
import { TranscriptionPanel } from './TranscriptionPanel'
import { usePlayerShortcuts } from './usePlayerShortcuts'

interface Props {
  log: RecordedFile
  onBack: () => void
}

export const DetailPage = withBoundary(function ({
  log: log__,
  onBack,
}: Props) {
  const playerRef = useRef<PlayerRef | null>(null)
  const [log, setCurrentVlog] = useState<RecordedFile>(log__)
  const [isDeleting, setIsDeleting] = useState(false)

  useMaybeCalculateDurationOnce(log.id)

  // Transcription state now lives inside TranscriptionPanel

  usePlayerShortcuts({ playerRef })

  // actions moved into Toolbar

  return (
    <div
      className={twMerge(
        ' gap-4 overflow-x-hidden overflow-y-scroll w-full py-4',
        'bg-one',
      )}
    >
      <main className="flex flex-col items-center gap-4 justify-start px-4 bg-one min-h-screen pb-5">
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

        <header className="flex flex-col gap-3 w-full">
          <TitleInput
            vlogId={log.id}
            title={log.title || ''}
            onLocalTitleChange={(value) =>
              setCurrentVlog((prev) => ({ ...prev, title: value }))
            }
          />
          <Toolbar vlogId={log.id} onBack={onBack} />
        </header>

        <div className="gap-4 w-full">
          <Summary vlog={log} />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <TranscriptionPanel log={log} vlogId={log.id} playerRef={playerRef} />
        </div>
      </main>
    </div>
  )
})

// HeaderButton moved into Toolbar

function VideoExtensionTag({ log }: { log: RecordedFile }) {
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
