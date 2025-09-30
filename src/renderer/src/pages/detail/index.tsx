import { useEffect, useRef, useState } from 'react'
import { useRouter } from '../../shared/Router'

interface PageProps {
  filePath: string
  fileName: string
}

export default function Page({ filePath, fileName }: PageProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      await window.electronAPI.openFileLocation(filePath)
    } catch (error) {
      console.error('Failed to open file location:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await window.electronAPI.deleteFile(filePath)
      // Go back to home after deleting
      router.goBack()
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file')
      setIsDeleting(false)
    }
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
            {fileName}
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
          src={`vlog-video://${filePath}`}
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

