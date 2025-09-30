import { useEffect, useRef, useState } from 'react'
import {
  getRecordingMode,
  getSelectedCameraId,
  setRecordingMode as saveRecordingMode,
  setSelectedCameraId as saveSelectedCameraId,
} from '../../ipc'
import { useRouter } from '../../shared/Router'
import { RecordingMode } from '../../types'
import { ScreenRecorder } from './ScreenRecorder'

export default function Page() {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<ScreenRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadCameras()
    loadSettings()

    return () => {
      stopCameraPreview()
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
      setRecordingTime((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isRecording])

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
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      )
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
        previewStream.getTracks().forEach((track) => track.stop())
      }

      // Start new preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      setPreviewStream(stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to start camera preview:', error)
    }
  }

  const stopCameraPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
      setPreviewStream(null)
    }
  }

  useEffect(() => {
    if (
      !isRecording &&
      (recordingMode === 'camera' || recordingMode === 'both') &&
      selectedCameraId
    ) {
      startCameraPreview(selectedCameraId)
    } else if (!isRecording) {
      stopCameraPreview()
    }
  }, [recordingMode, selectedCameraId, isRecording])

  // Update video element when recording stream changes
  useEffect(() => {
    if (
      isRecording &&
      recorder &&
      (recordingMode === 'camera' || recordingMode === 'both')
    ) {
      const cameraStream = recorder.getCameraStream()
      if (videoRef.current && cameraStream) {
        videoRef.current.srcObject = cameraStream
      }
    }
  }, [isRecording, recorder, recordingMode])

  // Save settings when they change
  useEffect(() => {
    if (selectedCameraId) {
      saveSelectedCameraId(selectedCameraId)
    }
  }, [selectedCameraId])

  useEffect(() => {
    saveRecordingMode(recordingMode)
  }, [recordingMode])

  const handleStartRecording = async () => {
    try {
      // Start recording first
      const newRecorder = new ScreenRecorder(recordingMode, selectedCameraId)
      setRecorder(newRecorder)
      await newRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Set up camera preview for recording (if camera is involved)
      if (recordingMode === 'camera' || recordingMode === 'both') {
        const cameraStream = newRecorder.getCameraStream()
        if (videoRef.current && cameraStream) {
          videoRef.current.srcObject = cameraStream
        }
      }

      // Stop preview stream after new stream is set up
      stopCameraPreview()
    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      alert(
        `Failed to start recording: ${errorMessage}\n\nPlease check:\n1. Camera/Screen recording permissions are granted\n2. No other apps are using the camera/screen`,
      )
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
      setRecordingTime(0)
      // Navigate back to library after stopping
      router.navigate({ name: 'library' })
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
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

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-screen bg-one">
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {/* Preview Area */}
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
          {isRecording ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-2 border-red-500 rounded-xl">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <span className="text-lg font-semibold text-contrast">
                  Recording {getModeLabel()}
                </span>
              </div>
              <div className="text-[32px] font-bold text-contrast tabular-nums">
                {formatTime(recordingTime)}
              </div>
            </>
          ) : null}

          {/* Camera Preview */}
          {(recordingMode === 'camera' || recordingMode === 'both') && (
            <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-one shadow-2xl">
              {previewStream || videoRef.current?.srcObject ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-8xl">📹</div>
                </div>
              )}
            </div>
          )}

          {recordingMode === 'screen' && (
            <div className="w-full aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border-4 border-one flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-4">🖥️</div>
                <p className="text-xl text-contrast font-semibold">
                  Screen Recording Mode
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          {/* Recording Mode - Hidden when recording */}
          {!isRecording && (
            <div className="flex flex-row gap-3">
              <label className="text-sm font-semibold text-contrast">
                Recording Mode
              </label>
              <div className="flex gap-3">
                <button
                  className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                    recordingMode === 'camera'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-two text-contrast hover:bg-[var(--bg-tertiary)]'
                  }`}
                  onClick={() => {
                    setRecordingMode('camera')
                  }}
                >
                  📹 Camera
                </button>
                <button
                  className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                    recordingMode === 'screen'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-two text-contrast hover:bg-[var(--bg-tertiary)]'
                  }`}
                  onClick={() => {
                    setRecordingMode('screen')
                  }}
                >
                  🖥️ Screen
                </button>
                <button
                  className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all ${
                    recordingMode === 'both'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-two text-contrast hover:bg-[var(--bg-tertiary)]'
                  }`}
                  onClick={() => {
                    setRecordingMode('both')
                  }}
                >
                  🎬 Both
                </button>
              </div>
            </div>
          )}

          {/* Camera Selection - Hidden when recording */}
          {!isRecording &&
            (recordingMode === 'camera' || recordingMode === 'both') &&
            cameras.length > 0 && (
              <div className="flex flex-row gap-3">
                <label className="text-sm font-semibold text-contrast">
                  Camera
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value)
                  }}
                  className="px-4 py-3 rounded-lg bg-two text-contrast border border-one focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label ||
                        `Camera ${camera.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Recording Button */}
          {isRecording ? (
            <button
              className="w-full px-8 py-6 bg-red-500 hover:bg-red-600 text-white text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl"
              onClick={handleStopRecording}
            >
              ⏹️ Stop Recording
            </button>
          ) : (
            <button
              className="w-full px-8 py-6 bg-red-500 hover:bg-red-600 text-white text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
              onClick={handleStartRecording}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                Start Recording
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
