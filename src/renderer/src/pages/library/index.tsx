import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { importVideoFile } from '../../ipc'
import { RecordedFile } from '../../types'
import { DetailPage } from './detail'
import { Sidebar } from './Sidebar'
import { PlaybackPreferencesProvider } from '../../shared/PlaybackPreferencesProvider'

export default function Page() {
  const [selectedVlog, setSelectedVlog] = useState<RecordedFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVlog) {
        setSelectedVlog(null)
      }
    }

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
        const results = []

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
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [selectedVlog])

  return (
    <PlaybackPreferencesProvider>
      <div className="flex h-screen bg-one overflow-hidden">
        <Sidebar
          selectedVlog={selectedVlog}
          onVideoSelect={setSelectedVlog}
          onClose={() => setSelectedVlog(null)}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full">
          {selectedVlog ? (
            <DetailPage
              key={selectedVlog?.id}
              vlog={selectedVlog}
              onBack={() => {
                setSelectedVlog(null)
              }}
            />
          ) : (
            <div
              className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
                isDragOver
                  ? 'bg-blue-500/10 border-2 border-dashed border-blue-500'
                  : ''
              }`}
            >
              <div className="text-center flex flex-col gap-2">
                <div className=" flex justify-center">
                  <Film size={40} className="text-secondary" />
                </div>
                <h3 className="text-[15px] font-medium text-secondary mb-2">
                  {isDragOver
                    ? 'Drop video files here'
                    : 'Select a vlog or drag video files here'}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </PlaybackPreferencesProvider>
  )
}
