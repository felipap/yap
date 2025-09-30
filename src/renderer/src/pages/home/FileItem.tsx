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
    <div className="file-item">
      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-details">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDate(file.created)}</span>
        </div>
      </div>
      <div className="file-actions">
        <button
          className="btn-primary"
          onClick={() => {
            onWatch(file)
          }}
          disabled={isDeleting}
        >
          ▶️ Watch
        </button>
        <button
          className="btn-secondary"
          onClick={handleOpenLocation}
          disabled={isDeleting}
        >
          📁 Show in Finder
        </button>
        <button
          className="btn-danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? '⏳' : '🗑️'} Delete
        </button>
      </div>
    </div>
  )
}

