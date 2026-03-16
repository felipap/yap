import { ReactNode, useEffect, useState } from 'react'
import { MdOutlineDriveFileMove, MdRefresh, MdSyncAlt } from 'react-icons/md'
import { FolderIcon, HeartIcon, TrashIcon } from '~/shared/icons'
import {
  convertToMp4,
  getConversionState,
  moveToDefaultFolder,
  openFileLocation,
  setLogFavorited,
  untrackLog,
} from '~/shared/ipc'
import { Tooltip } from '~/shared/ui/Tooltip'

interface Props {
  logId: string
  isFavorited: boolean
  isWebmOrMov: boolean
  isInDefaultFolder: boolean
  onDeleted: () => void
}

export function Toolbar({
  logId,
  isFavorited: initialFavorited,
  isWebmOrMov,
  isInDefaultFolder,
  onDeleted,
}: Props) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    const checkConversionState = async () => {
      const state = await getConversionState(logId)
      if (state.isActive) {
        setIsConverting(true)
        setConversionProgress(state.progress ?? 0)
      }
    }

    checkConversionState()
  }, [logId])

  useEffect(() => {
    const handleProgress = (updatedLogId: string, updatedProgress: number) => {
      if (updatedLogId === logId) {
        setConversionProgress(updatedProgress)
        if (updatedProgress >= 100) {
          setTimeout(() => {
            setIsConverting(false)
            setConversionProgress(0)
          }, 500)
        }
      }
    }

    const unsubscribe = window.electronAPI.onConversionProgress(handleProgress)

    return () => {
      unsubscribe()
    }
  }, [logId])

  const handleToggleFavorite = async () => {
    const newValue = !isFavorited
    setIsFavorited(newValue)
    await setLogFavorited(logId, newValue)
  }

  const handleOpenInFinder = async () => {
    try {
      await openFileLocation(logId)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleConvert = async () => {
    if (!confirm('Convert file to MP4? This may take a few minutes.')) {
      return
    }

    setIsConverting(true)
    setConversionProgress(0)

    try {
      const result = await convertToMp4(logId)
      if ('error' in result) {
        alert(result.error)
        return
      }
      alert(result.message)
    } catch (error) {
      console.error('Failed to convert video:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to convert video'
      alert(errorMessage)
    } finally {
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const handleMoveToDefaultFolder = async () => {
    setIsMoving(true)
    try {
      const result = await moveToDefaultFolder(logId)
      if (!result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to move to default folder:', error)
      alert('Failed to move to default folder')
    }
    setIsMoving(false)
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

  const getConvertTooltip = () => {
    if (isConverting) {
      if (conversionProgress > 0) {
        return `Converting ${conversionProgress}%`
      }
      return 'Converting...'
    }
    return 'Convert to MP4'
  }

  return (
    <div className="no-drag-region shadow-lg shadow-black/2 flex items-center bg-two divide-x rounded-full px-1">
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
        tooltip={
          navigator.platform.includes('Mac')
            ? 'Reveal in Finder'
            : 'Show in folder'
        }
      >
        <FolderIcon size={18} />
      </TooltipButton>
      {isWebmOrMov && (
        <TooltipButton
          onClick={handleConvert}
          disabled={isConverting}
          tooltip={getConvertTooltip()}
        >
          {isConverting ? (
            <MdRefresh size={18} className="animate-spin" />
          ) : (
            <MdSyncAlt size={18} />
          )}
        </TooltipButton>
      )}
      {!isInDefaultFolder && (
        <TooltipButton
          onClick={handleMoveToDefaultFolder}
          disabled={isMoving}
          tooltip={isMoving ? 'Moving...' : 'Move to default folder'}
        >
          {isMoving ? (
            <MdRefresh size={18} className="animate-spin" />
          ) : (
            <MdOutlineDriveFileMove size={18} />
          )}
        </TooltipButton>
      )}
      <TooltipButton
        onClick={handleDelete}
        disabled={isDeleting}
        tooltip="Remove"
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
  children: ReactNode
}

function TooltipButton({
  onClick,
  disabled,
  tooltip,
  children,
}: TooltipButtonProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center w-8 h-8 rounded-full text-contrast/50 hover:text-contrast transition-colors disabled:opacity-50"
      >
        {children}
      </button>
    </Tooltip>
  )
}
