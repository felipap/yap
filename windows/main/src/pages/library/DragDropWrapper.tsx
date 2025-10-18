import { useEffect, useState } from 'react'
import { importVideoFile } from '../../ipc'
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
      const videoFiles = files.filter(
        (file) =>
          file.type.startsWith('video/') ||
          file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i),
      )

      if (videoFiles.length > 0) {
        console.log('Dropped video files:')
        const results: ImportResult[] = []

        for (const file of videoFiles) {
          try {
            console.log(`- Importing: ${file.name} (${file.path})`)
            const result = await importVideoFile(file.path)

            if (result.success && result.vlog) {
              console.log(`- Successfully imported: ${result.vlog.name}`)
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
              message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        const errorCount = results.filter((r) => r.status === 'error').length

        let summaryMessage = `Import complete: ${successCount} imported`
        if (duplicateCount > 0) {
          summaryMessage += `, ${duplicateCount} duplicates skipped`
        }
        if (errorCount > 0) {
          summaryMessage += `, ${errorCount} failed`
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
    <div
      className={twMerge(
        'h-full w-full transition-colors duration-200',
        isDragOver
          ? 'bg-blue-500/10 border-2 border-dashed border-blue-500'
          : '',
      )}
    >
      {children}
    </div>
  )
}
