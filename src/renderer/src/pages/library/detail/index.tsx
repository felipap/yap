import { useEffect, useState } from 'react'
import { useRouter } from '../../shared/Router'
import { RecordedFile } from '../../types'
import { getRecordedFiles, openFileLocation, deleteFile } from '../../ipc'
import { Inner } from './Inner'

interface PageProps {
  vlogId: string
}

export default function Page({ vlogId }: PageProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [vlog, setVlog] = useState<RecordedFile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVlog = async () => {
      try {
        const files = await getRecordedFiles()
        const foundFile = files.find(f => f.id === vlogId)
        if (foundFile) {
          setVlog(foundFile)
        } else {
          setError('Vlog not found')
        }
      } catch (error) {
        console.error('Failed to load vlog:', error)
        setError('Failed to load vlog')
      } finally {
        setIsLoading(false)
      }
    }

    loadVlog()
  }, [vlogId])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.goBack()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [router])

  const handleOpenLocation = async () => {
    try {
      await openFileLocation(vlogId)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('Failed to open file location')
    }
  }

  const handleDelete = async () => {
    if (!vlog || !confirm(`Are you sure you want to delete "${vlog.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteFile(vlogId)
      // Go back to home after deleting
      router.goBack()
    } catch (error) {
      console.error('Failed to delete vlog:', error)
      alert('Failed to delete vlog')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-one text-[var(--text-primary)]">
        Loading...
      </div>
    )
  }

  console.log('vlog', vlog)

  if (error || !vlog) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-one gap-4">
        <h2 className="text-[var(--text-primary)] m-0">
          {error || 'Vlog not found'}
        </h2>
        <p className="text-[var(--text-secondary)] m-0">
          The vlog you're looking for doesn't exist or may have been deleted.
        </p>
        <button className="btn-primary" onClick={() => {
          router.goBack()
        }}>
          Go Back
        </button>
      </div>
    )
  }

  return (
    <Inner
      vlog={vlog}
      onBack={() => {
        router.goBack()
      }}
      onOpenLocation={handleOpenLocation}
      onDelete={handleDelete}
      isDeleting={isDeleting}
    />
  )
}
