import { useState, useEffect } from 'react'
import { RecordedFile } from '../../types'
import { openFileLocation, deleteFile } from '../../ipc'

interface VideoCardProps {
  file: RecordedFile
  onDeleted: () => void
  onWatch: (file: RecordedFile) => void
}

export function VideoCard({ file, onDeleted, onWatch }: VideoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string>('')

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
      minute: '2-digit',
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
    <div
      className="flex bg-two rounded-lg overflow-hidden border border-one hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => {
        if (!isDeleting) {
          onWatch(file)
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-80 h-48 bg-gray-900 overflow-hidden flex-shrink-0">
        {file.thumbnailPath ? (
          <img
            src={file.thumbnailPath}
            alt={file.name}
            className="w-full h-full object-cover z-10 relative"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="text-6xl mb-2">🎬</div>
            {thumbnailError && (
              <div className="text-xs text-red-400 text-center px-2">
                Thumbnail error: {thumbnailError}
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[20px] border-l-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Info and Actions */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            {file.name}
          </h3>
          <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.created)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            className="px-6 py-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--color-tertiary)] text-[var(--text-primary)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenLocation()
            }}
            disabled={isDeleting}
          >
            📁 Show in Finder
          </button>
          <button
            className="px-6 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            disabled={isDeleting}
          >
            {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
