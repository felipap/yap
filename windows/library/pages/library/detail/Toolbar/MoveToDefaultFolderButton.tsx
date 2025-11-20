import { FolderInput, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { moveToDefaultFolder } from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'

interface Props {
  vlogId: string
  disabled?: boolean
}

// Default folder is the recordings folder where new recordings are saved (can be custom or system default)
export function MoveToDefaultFolderButton({ vlogId, disabled }: Props) {
  const [isMoving, setIsMoving] = useState(false)

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

  return (
    <Button onClick={handleMoveToDefaultFolder} disabled={disabled || isMoving}>
      {isMoving ? (
        <>
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          <span>Moving...</span>
        </>
      ) : (
        <>
          <FolderInput size={16} strokeWidth={2} />
          <span>Move to default folder</span>
        </>
      )}
    </Button>
  )
}
