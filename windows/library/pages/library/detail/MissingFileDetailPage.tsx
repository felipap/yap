import { useState } from 'react'
import { MdDelete, MdFolder, MdRefresh } from 'react-icons/md'
import { MovieIcon } from '../../../../shared/icons'
import { openFileLocation, untrackLog } from '../../../../shared/ipc'
import { Button } from '../../../../shared/ui/Button'
import { EnrichedLog } from '../../../types'

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
      await untrackLog(log.id)
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
        <div className="relative inline-block">
          <MovieIcon size={40} className="text-[#AAA] dark:text-[#DDD]" />
          <div className="absolute inset-[-5px] flex items-center justify-center pointer-events-none">
            <div
              className="h-1 bg-[#777] dark:bg-[#DDD] origin-center"
              style={{ width: '100px', transform: 'rotate(-45deg)' }}
            />
          </div>
        </div>

        {/* Title and Message */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-primary">File not found</h2>
          <h3 className="text-md text-secondary/60">
            The file for this log has been moved or deleted.
          </h3>
        </div>

        {/* File Path */}
        {/* <div className="w-full rounded-lg border border-stroke bg-two p-4">
          <div className="text-xs font-medium text-secondary mb-2">
            Expected Location
          </div>
          <div className="text-sm font-mono text-primary break-all">
            {log.path}
          </div>
        </div> */}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-4">
          <div className="flex justify-center gap-2">
            <Button onClick={handleOpenLocation} disabled={isDeleting}>
              <MdFolder size={16} />
              <span>Open Folder</span>
            </Button>
            <Button onClick={handleUntrack} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <MdRefresh size={16} className="animate-spin" />
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
        </div>
      </div>
    </div>
  )
}
