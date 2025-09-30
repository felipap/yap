import { useRef } from 'react'
import { RecordedFile } from '../../../types'
import { TranscriptionPanel } from './TranscriptionPanel'
import { useVideoShortcuts } from './useVideoShortcuts'

interface InnerProps {
  vlog: RecordedFile
  onBack: () => void
  onOpenLocation: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function DetailPage({
  vlog,
  onBack,
  onOpenLocation,
  onDelete,
  isDeleting,
}: InnerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Register video shortcuts
  useVideoShortcuts({ videoRef })

  return (
    <div className="flex flex-col gap-4 h-screen bg-one overflow-scroll py-4">
      <main className="flex flex-col items-center gap-4 justify-center px-4 bg-one">
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          className="max-w-full max-h-full rounded-lg shadow-lg"
          src={`vlog-video://${vlog.id}`}
        >
          Your browser does not support the video tag.
        </video>

        <header className="flex flex-row items-center justify-between w-full">
          <div />
          <div className="no-drag-region flex gap-3">
            <HeaderButton onClick={onOpenLocation} disabled={isDeleting}>
              📁 Show in Finder
            </HeaderButton>
            <HeaderButton onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
            </HeaderButton>
          </div>
        </header>

        <div className="">
          <TranscriptionPanel vlogId={vlog.id} videoRef={videoRef} />
        </div>
      </main>
    </div>
  )
}

function HeaderButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      className="btn-secondary text-nowrap text-[12px] rounded-md border hover:opacity-80 transition-opacity bg-two h-7 px-2"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
