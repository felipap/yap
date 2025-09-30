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
    <div className="flex flex-col gap-4 h-screen bg-one overflow-scroll py-6">
      <header className="hidden drag-region px-3 py-4 flex items-center justify-between border-b border-one bg-two">
        <div className="no-drag-region flex items-center gap-4">
          <button onClick={onBack} className="btn-secondary px-2 py-2 text-sm">
            ←
          </button>
          <h2 className="text-[13px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold m-0 text-[var(--text-primary)]">
            {vlog.name}
          </h2>
        </div>

        <div className="no-drag-region flex gap-3">
          <HeaderButton onClick={onOpenLocation} disabled={isDeleting}>
            📁 Show in Finder
          </HeaderButton>
          <HeaderButton onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </HeaderButton>
        </div>
      </header>

      <main className="flex flex-col items-center gap-4 justify-center px-6 bg-one">
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
      className="btn-secondary text-nowrap"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
