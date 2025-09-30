import { useState, useEffect } from 'react'
import { RecordingControls } from './RecordingControls'
import { FileList } from './FileList'
import { RecordingMode, RecordedFile } from '../../types'
import { useRouter } from '../../shared/Router'
import {
  getRecordedFiles,
  getSelectedCameraId,
  getRecordingMode,
  setSelectedCameraId as saveSelectedCameraId,
  setRecordingMode as saveRecordingMode
} from '../../ipc'

export default function Page() {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [recordedFiles, setRecordedFiles] = useState<RecordedFile[]>([])

  useEffect(() => {
    loadCameras()
    loadSettings()
    loadRecordedFiles()

    // Refresh file list periodically
    const intervalId = setInterval(loadRecordedFiles, 2000)

    return () => {
      clearInterval(intervalId)
      stopCameraPreview()
    }
  }, [])

  const loadSettings = async () => {
    try {
      const savedCameraId = await getSelectedCameraId()
      const savedMode = await getRecordingMode()

      if (savedCameraId) {
        setSelectedCameraId(savedCameraId)
      }
      if (savedMode) {
        setRecordingMode(savedMode)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

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

  const loadRecordedFiles = async () => {
    try {
      const files = await getRecordedFiles()
      setRecordedFiles(files)
    } catch (error) {
      console.error('Failed to load recorded files:', error)
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
  }, [recordingMode, selectedCameraId])

  // Save settings when they change
  useEffect(() => {
    if (selectedCameraId) {
      saveSelectedCameraId(selectedCameraId)
    }
  }, [selectedCameraId])

  useEffect(() => {
    saveRecordingMode(recordingMode)
  }, [recordingMode])

  const handleStartRecording = () => {
    // Navigate to recording page with the selected mode and camera
    router.navigate({ name: 'recording' })
  }

  const handleFileWatch = (file: RecordedFile) => {
    router.navigate({
      name: 'detail',
      vlogId: file.id
    })
  }

  const handleFileDeleted = async () => {
    await loadRecordedFiles()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="drag-region p-6 border-b border-[var(--border)]">
        <h1 className="no-drag-region text-2xl font-bold mb-4 text-[var(--text-primary)]">
          Vlog Electron
        </h1>
        <div className="no-drag-region flex gap-6 items-start">
          <div className="flex-1">
            <RecordingControls
              isRecording={false}
              recordingMode={recordingMode}
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onRecordingModeChange={setRecordingMode}
              onCameraChange={setSelectedCameraId}
              onStartRecording={handleStartRecording}
              onStopRecording={() => { }}
            />
          </div>

          {previewStream && (recordingMode === 'camera' || recordingMode === 'both') && (
            <div className="w-80 h-[180px] bg-black rounded-lg overflow-hidden border-2 border-[var(--border)]">
              <video
                ref={(video) => {
                  if (video && previewStream) {
                    video.srcObject = previewStream
                    video.play()
                  }
                }}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recorded Files
          </h2>
        </div>

        <FileList
          files={recordedFiles}
          onFileDeleted={handleFileDeleted}
          onFileWatch={handleFileWatch}
        />
      </div>
    </div>
  )
}

