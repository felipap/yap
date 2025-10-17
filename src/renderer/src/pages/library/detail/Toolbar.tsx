import { useState } from 'react'
import { openFileLocation, untrackVlog } from '../../../ipc'
import { TranscribeButton } from './transcription/TranscribeButton'
import { useVlog } from '../../../shared/useVlogData'

interface ToolbarProps {
  vlogId: string
  canToggleTranscription: boolean
  showTranscription: boolean
  onToggleTranscription: () => void
  onBack: () => void
}

export function Toolbar({
  vlogId,
  canToggleTranscription,
  showTranscription,
  onToggleTranscription,
  onBack,
}: ToolbarProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { vlog } = useVlog(vlogId)

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
    <div className="no-drag-region flex gap-3">
      <TranscribeButton vlogId={vlogId} disabled={isDeleting} />

      {canToggleTranscription && (
        <HeaderButton onClick={onToggleTranscription}>
          {showTranscription ? '📝 Hide Transcript' : '📝 Show Transcript'}
        </HeaderButton>
      )}

      <HeaderButton onClick={handleOpenLocation} disabled={isDeleting}>
        📁 Show in Finder
      </HeaderButton>
      <HeaderButton onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? '⏳ Removing...' : '🗑️ Remove'}
      </HeaderButton>
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
  disabled?: boolean
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
