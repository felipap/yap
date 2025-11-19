import { Folder, FolderInput, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EnrichedLog } from '../../../../../../shared-types'
import {
  moveToDefaultFolder,
  openFileLocation,
  untrackVlog,
} from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'
import { JsonViewer } from '../JsonViewer'
import { ConvertButton } from './ConvertButton'

interface Props {
  log: EnrichedLog
  onBack: () => void
}

export function Toolbar({ log, onBack }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  const isWebm = log?.name?.toLowerCase().endsWith('.webm') || false
  const inDefaultFolder = log?.isInDefaultFolder ?? true

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(log.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `Remove item from your library? The file will remain on your computer.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await untrackVlog(log.id)
      onBack()
    } catch (error) {
      console.error('Failed to remove vlog from library:', error)
      alert('Failed to remove vlog from library')
      setIsDeleting(false)
    }
  }

  const handleMoveToDefaultFolder = async () => {
    setIsMoving(true)
    try {
      const result = await moveToDefaultFolder(log.id)
      if (!result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to move to default folder:', error)
      alert('Failed to move to default folder')
    }
    setIsMoving(false)
  }

  const isDisabled = isDeleting || isMoving

  return (
    <div className="no-drag-region flex gap-2 w-full overflow-x-scroll justify-end">
      <Button onClick={handleOpenLocation} disabled={isDisabled}>
        <Folder size={16} strokeWidth={2} />
        <span>Show in Finder</span>
      </Button>
      {isWebm && <ConvertButton vlogId={log.id} disabled={isDisabled} />}
      {!inDefaultFolder && (
        <Button onClick={handleMoveToDefaultFolder} disabled={isDisabled}>
          {isMoving ? (
            <>
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              <span>Moving...</span>
            </>
          ) : (
            <>
              <FolderInput size={16} strokeWidth={2} />
              <span>Move to default Folder</span>
            </>
          )}
        </Button>
      )}
      <Button variant="danger" onClick={handleDelete} disabled={isDisabled}>
        {isDeleting ? (
          <>
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            <span>Removing...</span>
          </>
        ) : (
          <>
            <Trash2 size={16} strokeWidth={2} />
            <span>Remove</span>
          </>
        )}
      </Button>
      <JsonViewer log={log} />

    </div>
  )
}
