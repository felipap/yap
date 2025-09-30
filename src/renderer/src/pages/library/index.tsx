import { useEffect, useState } from 'react'
import { deleteFile, getRecordedFiles, openFileLocation } from '../../ipc'
import { useRouter } from '../../shared/Router'
import { RecordedFile } from '../../types'
import { Inner } from './detail/Inner'
import { VideoCard } from './VideoCard'

export default function Page() {
  const router = useRouter()
  const [recordedFiles, setRecordedFiles] = useState<RecordedFile[]>([])
  const [selectedVlog, setSelectedVlog] = useState<RecordedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadRecordedFiles()

    // Refresh file list periodically
    const intervalId = setInterval(loadRecordedFiles, 2000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

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

  const loadRecordedFiles = async () => {
    try {
      const files = await getRecordedFiles()
      setRecordedFiles(files)
    } catch (error) {
      console.error('Failed to load recorded files:', error)
    }
  }

  const handleFileWatch = (file: RecordedFile) => {
    setSelectedVlog(file)
  }

  const handleFileDeleted = async () => {
    await loadRecordedFiles()
  }

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
      await loadRecordedFiles()
    } catch (error) {
      console.error('Failed to delete vlog:', error)
      alert('Failed to delete vlog')
      setIsDeleting(false)
    }
  }

  // If a video is selected, show detail view with sidebar
  if (selectedVlog) {
    return (
      <div className="flex h-screen bg-one">
        {/* Minimized video list sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--border)] bg-two overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold">Library</h2>
              <button
                onClick={() => {
                  setSelectedVlog(null)
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
                title="Close detail view"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {recordedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    setSelectedVlog(file)
                  }}
                  className={`text-left p-3 rounded-lg transition-colors ${
                    selectedVlog.id === file.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--color-tertiary)]'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {file.name}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      selectedVlog.id === file.id
                        ? 'text-blue-100'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(file.created)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detail view */}
        <div className="flex-1 flex flex-col">
          <Inner
            vlog={selectedVlog}
            onBack={() => {
              setSelectedVlog(null)
            }}
            onOpenLocation={handleOpenLocation}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    )
  }

  // Default library view
  return (
    <div className="flex flex-col h-screen bg-one">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {recordedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                No recordings yet
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Start recording to see your vlogs here
              </p>
              <button
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                onClick={() => {
                  router.navigate({ name: 'record' })
                }}
              >
                Record Your First Vlog
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
              {recordedFiles.map((file) => (
                <VideoCard
                  key={file.id}
                  file={file}
                  onDeleted={handleFileDeleted}
                  onWatch={handleFileWatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
