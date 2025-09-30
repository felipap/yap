import { useRef } from 'react'
import { RecordedFile } from '../../types'

interface InnerProps {
  vlog: RecordedFile
  onBack: () => void
  onOpenLocation: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function Inner({
  vlog,
  onBack,
  onOpenLocation,
  onDelete,
  isDeleting
}: InnerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="flex flex-col h-screen bg-one">
      {/* Header */}
      <div className="drag-region px-6 py-4 flex justify-between items-center border-b border-[var(--border)] bg-two">
        <div className="no-drag-region flex items-center gap-4">
          <button
            onClick={onBack}
            className="btn-secondary px-4 py-2 text-sm"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold m-0 text-[var(--text-primary)]">
            {vlog.name}
          </h2>
        </div>

        <div className="no-drag-region flex gap-3">
          <button
            className="btn-secondary"
            onClick={onOpenLocation}
            disabled={isDeleting}
          >
            📁 Show in Finder
          </button>
          <button
            className="btn-danger"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Video player */}
      <div className="flex-1 flex items-center justify-center p-6 bg-one">
        <video
          ref={videoRef}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg shadow-lg"
          src={`vlog-video://${vlog.id}`}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Footer hint */}
      <div className="px-6 py-3 text-center text-sm border-t border-[var(--border)] text-[var(--text-secondary)] bg-two">
        Press ESC to go back
      </div>
    </div>
  )
}

