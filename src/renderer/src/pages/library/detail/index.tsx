import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { loadVideoDuration, openFileLocation, untrackVlog } from '../../../ipc'
import { TitleInput } from './TitleInput'
import { useVlog } from '../../../shared/useVlogData'
import { withBoundary } from '../../../shared/withBoundary'
import { RecordedFile, TranscriptionResult } from '../../../types'
import { Summary } from './Summary'
import { TranscribeButton } from './transcription/TranscribeButton'
import { Toolbar } from './Toolbar'
import { useTranscriptionState } from './transcription/useTranscriptionState'
import { TranscriptionPanel } from './TranscriptionPanel'
import { useVideoShortcuts } from './useVideoShortcuts'
import { Video, VideoRef } from './Video'

interface Props {
  vlog: RecordedFile
  onBack: () => void
}

export const DetailPage = withBoundary(function ({ vlog, onBack }: Props) {
  const videoRef = useRef<VideoRef>(null)
  const [currentVlog, setCurrentVlog] = useState<RecordedFile>(vlog)
  const [showTranscription, setShowTranscription] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useMaybeCalculateDurationOnce(currentVlog.id)

  const {
    transcription,
    isTranscribing,
    transcriptionError,
    hasTranscription,
    transcribe,
    clearError,
  } = useTranscriptionState({ vlogId: currentVlog.id })

  useVideoShortcuts({ videoRef })

  // actions moved into Toolbar

  return (
    <div className="flex flex-col gap-4 h-screen bg-one overflow-x-hidden overflow-y-scroll w-full py-4">
      <main className="flex flex-col items-center gap-4 justify-start px-4 bg-one min-h-screen">
        <div className="w-full max-w-5xl">
          <Video
            ref={videoRef}
            vlogId={currentVlog.id}
            src={`vlog-video://${currentVlog.id}`}
          />
        </div>

        <header className="flex flex-row items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <TitleInput
              vlogId={currentVlog.id}
              title={currentVlog.title || ''}
              onLocalTitleChange={(value) =>
                setCurrentVlog((prev) => ({ ...prev, title: value }))
              }
            />
          </div>
          <Toolbar
            vlogId={currentVlog.id}
            canToggleTranscription={!!transcription}
            showTranscription={showTranscription}
            onToggleTranscription={() =>
              setShowTranscription(!showTranscription)
            }
            onBack={onBack}
          />
        </header>

        <div className="flex flex-col gap-4 w-full">
          <Summary vlog={currentVlog} transcription={transcription?.text} />
        </div>

        {showTranscription && (
          <div className="flex flex-col gap-4 w-full">
            <TranscriptionPanel
              vlogId={currentVlog.id}
              videoRef={videoRef}
              onTranscribe={transcribe}
              isTranscribing={isTranscribing}
              transcriptionError={transcriptionError}
              transcription={transcription}
            />
          </div>
        )}
      </main>
    </div>
  )
})

// HeaderButton moved into Toolbar

function VideoExtensionTag({ currentVlog }: { currentVlog: RecordedFile }) {
  let color = 'bg-blue-100 text-blue-800'
  let inner
  if (currentVlog.path.endsWith('.webm')) {
    inner = 'webm'
    color = 'bg-green-100 text-green-800'
  } else if (currentVlog.path.endsWith('.mp4')) {
    inner = 'mp4'
    color = 'bg-yellow-100 text-yellow-800'
  } else if (currentVlog.path.endsWith('.mov')) {
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
