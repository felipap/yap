import { useEffect, useRef, useState } from 'react'
import { useRouter } from '../../shared/Router'
import { RecordedFile } from '../../types'
import { getRecordedFiles, openFileLocation, deleteFile } from '../../ipc'

interface PageProps {
  vlogId: string
}

export default function Page({ vlogId }: PageProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}
      >
        Loading...
      </div>
    )
  }

  console.log('vlog', vlog)

  if (error || !vlog) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          gap: '16px'
        }}
      >
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
          {error || 'Vlog not found'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          // @ts-ignore - Electron specific CSS
          WebkitAppRegion: 'drag'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          // @ts-ignore - Electron specific CSS
          WebkitAppRegion: 'no-drag'
        }}>
          <button
            onClick={() => {
              router.goBack()
            }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: 0
            }}
          >
            {vlog.name}
          </h2>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          // @ts-ignore - Electron specific CSS
          WebkitAppRegion: 'no-drag'
        }}>
          <button
            className="btn-secondary"
            onClick={handleOpenLocation}
            disabled={isDeleting}
          >
            📁 Show in Finder
          </button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Video player */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-primary)'
        }}
      >
        <video
          ref={videoRef}
          controls
          autoPlay
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
          src={`vlog-video://${vlogId}`}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '12px 24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}
      >
        Press ESC to go back
      </div>
    </div>
  )
}
