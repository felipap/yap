import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { deleteFile, openFileLocation, importVideoFile } from '../../ipc'
import { RecordedFile } from '../../types'
import { DetailPage } from './detail'
import { Sidebar } from './Sidebar'

export default function Page() {
  const [selectedVlog, setSelectedVlog] = useState<RecordedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
        for (const file of videoFiles) {
          try {
            console.log(`- Importing: ${file.name} (${file.path})`)
            const importedFile = await importVideoFile(file.path)
            console.log(`- Successfully imported: ${importedFile.name}`)
          } catch (error) {
            console.error(`- Failed to import ${file.name}:`, error)
            alert(
              `Failed to import ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
          }
        }
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

  const handleOpenLocation = async () => {
    if (!selectedVlog) {
      return
    }
    try {
      await openFileLocation(selectedVlog.id)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (
      !selectedVlog ||
      !confirm(`Are you sure you want to delete "${selectedVlog.name}"?`)
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteFile(selectedVlog.id)
      setSelectedVlog(null)
    } catch (error) {
      console.error('Failed to delete vlog:', error)
      alert('Failed to delete vlog')
      setIsDeleting(false)
    }
  }

  return (
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
            onOpenLocation={handleOpenLocation}
            onDelete={handleDelete}
            isDeleting={isDeleting}
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
  )
}
