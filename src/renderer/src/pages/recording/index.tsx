import { useState, useEffect, useRef } from 'react'
import { ScreenRecorder } from './ScreenRecorder'
import { RecordingMode } from '../../types'
import { useRouter } from '../../shared/Router'
import { getSelectedCameraId, getRecordingMode } from '../../ipc'

export default function Page() {
  const router = useRouter()
  const [recorder, setRecorder] = useState<ScreenRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const [recordingTime, setRecordingTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadSettingsAndStart()

    return () => {
      // Cleanup if component unmounts while recording
      if (recorder) {
        recorder.stop().catch(console.error)
      }
    }
  }, [])

  useEffect(() => {
    if (!isRecording) {
      return
    }

    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isRecording])

  const loadSettingsAndStart = async () => {
    try {
      const savedCameraId = await getSelectedCameraId()
      const savedMode = await getRecordingMode()

      const mode = savedMode || 'camera'
      const cameraId = savedCameraId || ''

      setRecordingMode(mode)

      // Auto-start recording
      await startRecording(mode, cameraId)
    } catch (error) {
      console.error('Failed to load settings or start recording:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to start recording: ${errorMessage}\n\nPlease check:\n1. Camera/Screen recording permissions are granted\n2. No other apps are using the camera/screen`)
      router.goBack()
    }
  }

  const startRecording = async (mode: RecordingMode, cameraId: string) => {
    const newRecorder = new ScreenRecorder(mode, cameraId)
    setRecorder(newRecorder)
    await newRecorder.start()
    setIsRecording(true)

    // Set up camera preview
    if (videoRef.current && newRecorder.getCameraStream()) {
      videoRef.current.srcObject = newRecorder.getCameraStream()
    }
  }

  const handleStopRecording = async () => {
    if (!recorder) {
      return
    }

    try {
      await recorder.stop()
      setIsRecording(false)
      setRecorder(null)
      // Go back to home after stopping
      router.goBack()
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
  }

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getModeLabel = () => {
    switch (recordingMode) {
      case 'screen':
        return 'Screen'
      case 'camera':
        return 'Camera'
      case 'both':
        return 'Screen + Camera'
      default:
        return ''
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-primary)',
      position: 'relative'
    }}>
      {/* Recording indicator */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        right: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgb(239, 68, 68)',
          borderRadius: '12px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'rgb(239, 68, 68)',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            Recording {getModeLabel()}
          </span>
        </div>

        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {formatTime(recordingTime)}
        </div>
      </div>

      {/* Camera preview */}
      {(recordingMode === 'camera' || recordingMode === 'both') && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          width: '320px',
          height: '240px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '3px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          background: 'var(--bg-secondary)'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Mirror the video for a more natural preview
            }}
          />
        </div>
      )}

      {/* Main content */}
      <div style={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          🔴
        </div>

        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Recording in Progress
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)'
          }}>
            Click stop when you're ready to finish
          </p>
        </div>

        <button
          className="btn-danger"
          onClick={handleStopRecording}
          style={{
            fontSize: '18px',
            padding: '16px 32px',
            marginTop: '16px'
          }}
        >
          ⏹️ Stop Recording
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}

