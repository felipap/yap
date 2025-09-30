import { useState } from 'react'
import { RecordedFile } from '../../types'
import { openFileLocation, deleteFile } from '../../ipc'

interface FileItemProps {
  file: RecordedFile
  onDeleted: () => void
  onWatch: (file: RecordedFile) => void
}

export function FileItem({ file, onDeleted, onWatch }: FileItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes'
    }
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(file.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteFile(file.id)
      onDeleted()
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--background-color-three)] hover:bg-[var(--color-tertiary)] transition-colors">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="text-base font-medium text-[var(--text-color-primary)] truncate">{file.name}</div>
        <div className="flex gap-3 text-sm text-[var(--text-color-secondary)]">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDate(file.created)}</span>
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <button
          className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            onWatch(file)
          }}
          disabled={isDeleting}
        >
          ▶️ Watch
        </button>
        <button
          className="px-4 py-2 rounded-md bg-[var(--color-btn)] hover:bg-[var(--color-tertiary)] text-[var(--text-color-primary)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleOpenLocation}
          disabled={isDeleting}
        >
          📁 Show in Finder
        </button>
        <button
          className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? '⏳' : '🗑️'} Delete
        </button>
      </div>
    </div>
  )
}

