import { useCallback, useEffect, useState } from 'react'
import { MdFolder } from 'react-icons/md'
import { importVideoFile } from '../../../shared/ipc'
import { ImportResult as IpcImportResult } from '../../../../shared-types'
import { twMerge } from 'tailwind-merge'

interface ImportResult {
  file: string
  status: 'success' | 'duplicate' | 'error'
  message: string
}

// Electron extends File with a path property
interface ElectronFile extends File {
  path: string
}

interface Props {
  children: React.ReactNode
  onImportComplete?: (results: ImportResult[]) => void
}

export function DragDropWrapper({ children, onImportComplete }: Props) {
  const handleDrop = useCallback(
    async (files: ElectronFile[]) => {
      const results: ImportResult[] = []

      for (const file of files) {
        if (!file.path) {
          results.push({
            file: file.name,
            status: 'error',
            message: 'Could not get file path',
          })
          continue
        }

        try {
          const result: IpcImportResult = await importVideoFile(file.path)

          if (result.success && result.log) {
            results.push({
              file: file.name,
              status: 'success',
              message: result.message,
            })
          } else if (result.isDuplicate) {
            results.push({
              file: file.name,
              status: 'duplicate',
              message: result.message,
            })
          } else {
            results.push({
              file: file.name,
              status: 'error',
              message: result.message || 'Import failed',
            })
          }
        } catch (error) {
          results.push({
            file: file.name,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      if (onImportComplete) {
        onImportComplete(results)
      }
    },
    [onImportComplete],
  )

  const { isDragOver } = useDragDropMedia(handleDrop)

  return (
    <div className="relative h-full w-full">
      <div
        className={twMerge(
          'absolute inset-0 transition-colors duration-200 flex items-center justify-center',
          isDragOver ? 'bg-blue-500/30 border-2 border-blue-500 z-10 ' : '',
        )}
      >
        <div className="flex items-center gap-3 text-[30px] text-blue-800 dark:text-blue-300">
          {isDragOver && <AnimatedFolderIcon />}
          <span>Drop media file</span>
        </div>
      </div>
      <div className="relative h-full w-full">{children}</div>
    </div>
  )
}

function useDragDropMedia(
  onDrop: (files: ElectronFile[]) => void | Promise<void>,
) {
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer?.files || [])
      const mediaFiles = files.filter(
        (file) =>
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/') ||
          file.name.match(
            /\.(mp4|webm|mov|avi|mkv|mp3|m4a|wav|ogg|aac|flac)$/i,
          ),
      ) as ElectronFile[]

      if (mediaFiles.length > 0) {
        await onDrop(mediaFiles)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onDrop])

  return { isDragOver }
}

function AnimatedFolderIcon() {
  return (
    <MdFolder
      size={32}
      style={{
        animation: 'tilt 1s ease-in-out',
      }}
    />
  )
}
