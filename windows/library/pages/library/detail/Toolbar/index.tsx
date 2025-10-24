import { useState } from 'react'
import { openFileLocation, untrackVlog } from '../../../../../shared/ipc'
import { useVlog } from '../../../../../shared/useVlogData'
import { HeaderButton } from './HeaderButton'
import { ConvertButton } from './ConvertButton'

interface ToolbarProps {
  vlogId: string
  onBack: () => void
}

export function Toolbar({ vlogId, onBack }: ToolbarProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { vlog } = useVlog(vlogId)

  const isWebm = vlog?.name?.toLowerCase().endsWith('.webm') || false

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

  return (
    <div className="no-drag-region flex gap-1.5 w-full overflow-x-scroll">
      <HeaderButton onClick={handleOpenLocation} disabled={isDeleting}>
        📁 Show in Finder
      </HeaderButton>
      {isWebm && <ConvertButton vlogId={vlogId} disabled={isDeleting} />}
      <HeaderButton onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? '⏳ Removing...' : '🗑️ Remove'}
      </HeaderButton>
    </div>
  )
}
