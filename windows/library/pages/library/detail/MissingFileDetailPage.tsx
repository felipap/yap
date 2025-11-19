import { Folder, Loader2 } from 'lucide-react'
import { MdDelete } from 'react-icons/md'
import { useState } from 'react'
import { openFileLocation, untrackVlog } from '../../../../shared/ipc'
import { EnrichedLog } from '../../../types'
import { Button } from '../../../../shared/ui/Button'

interface Props {
  log: EnrichedLog
  onBack: () => void
}

export function MissingFileDetailPage({ log, onBack }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(log.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleUntrack = async () => {
    if (
      !confirm(`Are you sure you want to remove this log from your library?`)
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await untrackVlog(log.id)
      onBack()
    } catch (error) {
      console.error('Failed to remove from library:', error)
      alert('Failed to remove from library')
      setIsDeleting(false)
    }
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-one">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title and Message */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-primary">
            Video file not found
          </h2>
          <p className="text-base text-secondary">
            The video file for this recording has been moved or deleted.
          </p>
        </div>

        {/* File Path */}
        <div className="w-full rounded-lg border border-stroke bg-two p-4">
          <div className="text-xs font-medium text-secondary mb-2">
            Expected Location
          </div>
          <div className="text-sm font-mono text-primary break-all">
            {log.path}
          </div>
        </div>

        {/* Recording Info */}
        {log.title && (
          <div className="w-full rounded-lg border border-stroke bg-two p-4">
            <div className="text-xs font-medium text-secondary mb-2">
              Recording Title
            </div>
            <div className="text-sm text-primary">{log.title}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-4">
          <div className="flex justify-center gap-2">
            <Button
              variant="header"
              onClick={handleOpenLocation}
              disabled={isDeleting}
            >
              <Folder size={16} strokeWidth={2} />
              <span>Show in Finder</span>
            </Button>
            <Button
              variant="header"
              onClick={handleUntrack}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <MdDelete size={16} />
                  <span>Remove from Library</span>
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-secondary">
              The recording metadata is still saved. If you locate the file,
              move it back to the expected location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
