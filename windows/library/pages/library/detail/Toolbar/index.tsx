import { useState } from 'react'
import {
  openFileLocation,
  untrackVlog,
  moveToDefaultFolder,
} from '../../../../../shared/ipc'
import { useVlog } from '../../../../../shared/useVlogData'
import { HeaderButton } from './HeaderButton'
import { ConvertButton } from './ConvertButton'

interface ToolbarProps {
  vlogId: string
  onBack: () => void
}

export function Toolbar({ vlogId, onBack }: ToolbarProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const { vlog } = useVlog(vlogId)

  const isWebm = vlog?.name?.toLowerCase().endsWith('.webm') || false
  const inDefaultFolder = vlog?.isInDefaultFolder ?? true

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(vlogId)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to remove "${vlog?.name ?? 'this vlog'}" from your library? The file will remain on your computer.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await untrackVlog(vlogId)
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
      const result = await moveToDefaultFolder(vlogId)
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
    <div className="no-drag-region flex gap-1.5 w-full overflow-x-scroll">
      <HeaderButton onClick={handleOpenLocation} disabled={isDisabled}>
        📁 Show in Finder
      </HeaderButton>
      {isWebm && <ConvertButton vlogId={vlogId} disabled={isDisabled} />}
      {!inDefaultFolder && (
        <HeaderButton onClick={handleMoveToDefaultFolder} disabled={isDisabled}>
          {isMoving ? '⏳ Moving...' : '📂 Move to default Folder'}
        </HeaderButton>
      )}
      <HeaderButton onClick={handleDelete} disabled={isDisabled}>
        {isDeleting ? '⏳ Removing...' : '🗑️ Remove'}
      </HeaderButton>
    </div>
  )
}
