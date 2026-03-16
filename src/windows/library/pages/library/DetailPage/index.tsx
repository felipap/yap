import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { onViewLogEntry } from '~/shared/ipc'
import { PlaybackPreferencesProvider } from '~/shared/PlaybackPreferencesProvider'
import { Tooltip } from '~/shared/ui/Tooltip'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false)

  useEffect(() => {
    onViewLogEntry(log.id)
  }, [log.id])

  usePlayerShortcuts({ playerRef })

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 400)
      setIsPlayerMinimized(container.scrollTop > 100)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      ref={scrollRef}
      className={twMerge(
        'gap-7 overflow-x-hidden overflow-y-scroll w-full pb-8 relative',
      )}
    >
      <div className="sticky top-0 z-10 bg-one">
        <div className="h-(--nav-height) drag-region " />
        <div className="pl-2 pr-4 pb-3">
          <Player
            ref={playerRef}
            logId={log.id}
            isVideo={!log.isAudioOnly}
            src={`log-media://${log.id}`}
            className={twMerge(
              'w-full rounded-md transition-all duration-300',
              log.isAudioOnly
                ? 'max-h-[100px]'
                : isPlayerMinimized
                  ? 'h-[120px]'
                  : 'h-[350px]',
            )}
          />
        </div>
      </div>
      <main className="flex flex-col gap-5 mt-4 pl-2 pr-4">
        <div className="bg-two rounded-lg p-4 pt-3 flex flex-col gap-2">
          <div className="flex items-start gap-2 -ml-3">
            <TitleInput
              logId={log.id}
              isVideo={!log.isAudioOnly}
              title={log.title || ''}
              className="flex-1 min-w-0"
            />
            <div className="-mt-5 -mr-3">
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
          <SummarySubtitle log={log} />
        </div>

        <div className="bg-two rounded-lg p-3 relative">
          <TranscriptionPanel log={log} logId={log.id} playerRef={playerRef} />
          <DebugToolbar log={log} unselect={unselect} />
        </div>
      </main>
      <ScrollToTopButton onClick={scrollToTop} visible={showScrollTop} />
    </div>
  )
}

function ScrollToTopButton({
  onClick,
  visible,
}: {
  onClick: () => void
  visible: boolean
}) {
  return (
    <div
      className={twMerge(
        'fixed bottom-6 right-8 transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <Tooltip content="Scroll to top" placement="left">
        <button
          onClick={onClick}
          className="w-8 h-8 text-inverted not-dark:font-light bg-contrast rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-200"
        >
          ↑
        </button>
      </Tooltip>
    </div>
  )
}
