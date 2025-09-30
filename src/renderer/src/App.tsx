import React, { useState, useEffect } from 'react'
import { RecordingControls, RecordingMode } from './RecordingControls'
import { FileList } from './FileList'
import { ScreenRecorder } from './ScreenRecorder'

interface RecordedFile {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
}

export function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedFiles, setRecordedFiles] = useState<RecordedFile[]>([])
  const [recorder, setRecorder] = useState<ScreenRecorder | null>(null)
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    loadRecordedFiles()
    loadCameras()
  }, [])

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameras(videoDevices)
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to load cameras:', error)
    }
  }

  const startCameraPreview = async (cameraId: string) => {
    try {
      // Stop any existing preview
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop())
      }

      // Start new preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })
      setPreviewStream(stream)
    } catch (error) {
      console.error('Failed to start camera preview:', error)
    }
  }

  const stopCameraPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop())
      setPreviewStream(null)
    }
  }

  useEffect(() => {
    if ((recordingMode === 'camera' || recordingMode === 'both') && selectedCameraId) {
      startCameraPreview(selectedCameraId)
    } else {
      stopCameraPreview()
    }

    return () => {
      stopCameraPreview()
    }
  }, [recordingMode, selectedCameraId])

  const loadRecordedFiles = async () => {
    try {
      const files = await window.electronAPI.getRecordedFiles()
      setRecordedFiles(files)
    } catch (error) {
      console.error('Failed to load recorded files:', error)
    }
  }

  const handleStartRecording = async () => {
    try {
      const newRecorder = new ScreenRecorder(recordingMode, selectedCameraId)
      setRecorder(newRecorder)
      await newRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to start recording: ${errorMessage}\n\nPlease check:\n1. Camera/Screen recording permissions are granted\n2. No other apps are using the camera/screen`)
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
      await loadRecordedFiles()
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
  }

  const handleFileDeleted = async () => {
    await loadRecordedFiles()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '16px',
          color: 'var(--text-primary)'
        }}>
          Vlog Electron
        </h1>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <RecordingControls
              isRecording={isRecording}
              recordingMode={recordingMode}
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onRecordingModeChange={setRecordingMode}
              onCameraChange={setSelectedCameraId}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>

          {previewStream && (recordingMode === 'camera' || recordingMode === 'both') && (
            <div style={{
              width: '320px',
              height: '180px',
              background: 'black',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid var(--border)'
            }}>
              <video
                ref={(video) => {
                  if (video && previewStream) {
                    video.srcObject = previewStream
                    video.play()
                  }
                }}
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            Recorded Files
          </h2>
        </div>

        <FileList
          files={recordedFiles}
          onFileDeleted={handleFileDeleted}
        />
      </div>
    </div>
  )
}

