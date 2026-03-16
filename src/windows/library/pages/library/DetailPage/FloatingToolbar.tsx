import { ReactNode, useState } from 'react'
import { FolderIcon, HeartIcon, TrashIcon } from '~/shared/icons'
import { openFileLocation, untrackLog } from '~/shared/ipc'

interface Props {
  logId: string
  onDeleted: () => void
}

export function FloatingToolbar({ logId, onDeleted }: Props) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  const handleOpenInFinder = async () => {
    try {
      await openFileLocation(logId)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        'Remove item from your library? The file will remain on your computer.',
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await untrackLog(logId)
      onDeleted()
    } catch (error) {
      console.error('Failed to remove log from library:', error)
      alert('Failed to remove log from library')
      setIsDeleting(false)
    }
  }

  return (
    <div className="no-drag-region flex items-center bg-two divide-x rounded-full px-1">
      <TooltipButton
        onClick={handleToggleFavorite}
        tooltip={isFavorited ? 'Unfavorite' : 'Favorite'}
      >
        <HeartIcon
          size={18}
          filled={isFavorited}
          className={isFavorited ? 'text-red-500' : ''}
        />
      </TooltipButton>
      <TooltipButton
        onClick={handleOpenInFinder}
        tooltip={navigator.platform.includes('Mac') ? 'Reveal in Finder' : 'Show in folder'}
      >
        <FolderIcon size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={handleDelete}
        disabled={isDeleting}
        tooltip="Remove"
        alignRight
      >
        <TrashIcon size={18} />
      </TooltipButton>
    </div>
  )
}

interface TooltipButtonProps {
  onClick: () => void
  disabled?: boolean
  tooltip: string
  alignRight?: boolean
  children: ReactNode
}

function TooltipButton({
  onClick,
  disabled,
  tooltip,
  alignRight,
  children,
}: TooltipButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center w-8 h-8 rounded-full text-contrast/50 hover:text-contrast transition-colors disabled:opacity-50"
      >
        {children}
      </button>
      <div
        className={`absolute top-full mt-3 px-2 py-1 bg-contrast text-inverted text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap pointer-events-none z-50 ${
          alignRight ? 'right-0' : 'left-1/2 -translate-x-1/2'
        }`}
      >
        {tooltip}
      </div>
    </div>
  )
}
