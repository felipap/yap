import { useEffect, useState } from 'react'
import { deleteFile, openFileLocation } from '../../ipc'
import { RecordedFile } from '../../types'
import { DetailPage } from './detail'
import { Sidebar } from './Sidebar'

export default function Page() {
  const [selectedVlog, setSelectedVlog] = useState<RecordedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVlog) {
        setSelectedVlog(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Select a video
              </h3>
              <p className="text-[var(--text-secondary)]">
                Choose a video from the sidebar to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
