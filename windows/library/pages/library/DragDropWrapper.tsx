import { useEffect, useState } from 'react'
import { importVideoFile } from '../../../shared/ipc'
import { twMerge } from 'tailwind-merge'

interface DragDropWrapperProps {
  children: React.ReactNode
  onImportComplete?: (results: ImportResult[]) => void
}

interface ImportResult {
  file: string
  status: 'success' | 'duplicate' | 'error'
  message: string
}

export function DragDropWrapper({
  children,
  onImportComplete,
}: DragDropWrapperProps) {
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
      )

      if (mediaFiles.length > 0) {
        console.log('Dropped media files:')
        const results: ImportResult[] = []

        for (const file of mediaFiles) {
          try {
            console.log(`- Importing: ${file.name}`)
            // Use file.path to get the full file path (available in Electron)
            const filePath = (file as any).path
            if (!filePath) {
              throw new Error('Could not get file path')
            }
            const result = await importVideoFile(filePath)

            if (result.success && result.log) {
              console.log(`- Successfully imported: ${result.log.name}`)
              results.push({
                file: file.name,
                status: 'success',
                message: result.message,
              })
            } else if (result.isDuplicate) {
              console.log(`- Duplicate found: ${file.name}`)
              results.push({
                file: file.name,
                status: 'duplicate',
                message: result.message,
              })
            }
          } catch (error) {
            console.error(`- Failed to import ${file.name}:`, error)
            results.push({
              file: file.name,
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }

        // Show summary of import results
        const successCount = results.filter(
          (r) => r.status === 'success',
        ).length
        const duplicateCount = results.filter(
          (r) => r.status === 'duplicate',
        ).length
        const errorResults = results.filter((r) => r.status === 'error')
        const errorCount = errorResults.length

        let summaryMessage = `Import complete: ${successCount} imported`
        if (duplicateCount > 0) {
          summaryMessage += `, ${duplicateCount} duplicates skipped`
        }
        if (errorCount > 0) {
          summaryMessage += `, ${errorCount} failed`

          // Add detailed error messages
          summaryMessage += '\n\nErrors:'
          errorResults.forEach((result) => {
            summaryMessage += `\n• ${result.file}: ${result.message}`
          })
        }

        alert(summaryMessage)

        // Call the callback if provided
        if (onImportComplete) {
          onImportComplete(results)
        }
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
  }, [onImportComplete])

  return (
    <div className="relative h-full w-full">
      <div
        className={twMerge(
          'absolute inset-0 transition-colors duration-200 flex items-center justify-center',
          isDragOver ? 'bg-blue-500/30 border-2 border-blue-500 z-10 ' : '',
        )}
      >
        <div className="text-[30px] text-blue-800 dark:text-blue-300">
          Drop media file
        </div>
      </div>
      <div className="relative h-full w-full">{children}</div>
    </div>
  )
}
