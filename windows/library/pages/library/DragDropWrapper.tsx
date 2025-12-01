import { useCallback, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ImportResult as IpcImportResult } from '../../../../shared-types'
import { FolderIcon } from '../../../shared/icons'
import { importVideoFile } from '../../../shared/ipc'

interface ImportResult {
  file: string
  status: 'success' | 'duplicate' | 'error'
  message: string
}

// Electron extends File with a path property
interface ElectronFile extends File {
  path: string
}

function getImportSummary(results: ImportResult[]): string | null {
  if (results.length === 0) {
    return null
  }

  if (results.length === 1) {
    const [result] = results

    if (result.status === 'success') {
      return `Imported "${result.file}" successfully.`
    }

    if (result.status === 'duplicate') {
      return `"${result.file}" is already in your library.`
    }

    return `Could not import "${result.file}": ${result.message}`
  }

  const successCount = results.filter(
    (result) => result.status === 'success',
  ).length
  const duplicateCount = results.filter(
    (result) => result.status === 'duplicate',
  ).length
  const errorCount = results.filter(
    (result) => result.status === 'error',
  ).length

  const parts: string[] = []

  if (successCount > 0) {
    parts.push(`${successCount} imported`)
  }

  if (duplicateCount > 0) {
    parts.push(`${duplicateCount} already in your library`)
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} failed`)
  }

  return `Finished importing ${results.length} files: ${parts.join(', ')}.`
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

      console.log('results', results)

      const summary = getImportSummary(results)
      if (summary) {
        window.alert(summary)
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
        <div className="flex flex-col items-center gap-3 text-blue-800 dark:text-blue-300">
          {isDragOver && (
            <FolderIcon
              className="ml-[-10px]"
              size={60}
              style={{
                animation: 'tilt 300ms ease-in-out forwards',
                // animationDelay: '50ms',
              }}
            />
          )}
          <span className="text-[25px] font-medium track-20">
            Drop media file
          </span>
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
      // Allow dropping by preventing the browser's default handling
      e.preventDefault()

      // Event fired over the window.
      if (e.relatedTarget === null) {
        setIsDragOver(true)
        // console.log('handleDragOver window')
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      // Event fired over the window.
      if (e.relatedTarget === null) {
        setIsDragOver(false)
      }
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
        console.log('Media files dropped', mediaFiles)
        await onDrop(mediaFiles)
      } else {
        console.log('No media files dropped')
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
