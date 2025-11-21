import { useState } from 'react'
import { MdFolder, MdRefresh } from 'react-icons/md'
import { moveToDefaultFolder } from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'

interface Props {
  logId: string
  disabled?: boolean
}

// Default folder is the recordings folder where new recordings are saved (can be custom or system default)
export function MoveToDefaultFolderButton({ logId, disabled }: Props) {
  const [isMoving, setIsMoving] = useState(false)

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

  return (
    <Button onClick={handleMoveToDefaultFolder} disabled={disabled || isMoving}>
      {isMoving ? (
        <>
          <MdRefresh size={16} className="animate-spin" />
          <span>Moving...</span>
        </>
      ) : (
        <>
          <MdFolder size={16} />
          <span>Move to default folder</span>
        </>
      )}
    </Button>
  )
}
