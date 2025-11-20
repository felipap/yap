import { useState } from 'react'
import { MdDelete, MdRefresh } from 'react-icons/md'
import { untrackVlog } from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'

interface Props {
  vlogId: string
  disabled?: boolean
  onDeleted: () => void
}

export function DeleteButton({ vlogId, disabled, onDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

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
      await untrackVlog(vlogId)
      onDeleted()
    } catch (error) {
      console.error('Failed to remove vlog from library:', error)
      alert('Failed to remove vlog from library')
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="danger"
      onClick={handleDelete}
      disabled={disabled || isDeleting}
    >
      {isDeleting ? (
        <>
          <MdRefresh size={16} className="animate-spin" />
          <span>Removing...</span>
        </>
      ) : (
        <>
          <MdDelete size={16} />
          <span>Remove</span>
        </>
      )}
    </Button>
  )
}
