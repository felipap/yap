import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'react-router-dom'
import { Camera, Mic, Square, Play } from 'lucide-react'
import { Button } from '../../../shared/Button'
import {
  getSelectedCameraId,
  getSelectedMicrophoneId,
  saveRecordingMode,
} from '../../../shared/settings'

export default function Page() {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<
    'camera' | 'screen' | 'both'
  >('camera')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingState, setRecordingState] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadCameras()
    loadMicrophones()
    loadSettings()

    // Set up recording state listener
    const handleRecordingStateChange = (state: any) => {
      setRecordingState(state)
      setIsRecording(state.isRecording)
    }

    window.electronAPI.onIpcEvent(
      'recording-state-changed',
      handleRecordingStateChange,
    )

    return () => {
      // Cleanup if component unmounts while recording
      if (isRecording) {
        window.electronAPI.emergencySaveRecording().catch(console.error)
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

    // Add beforeunload handler for crash protection
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        // Trigger emergency save
        window.electronAPI.emergencySaveRecording().catch(console.error)
        e.preventDefault()
        e.returnValue = 'Recording in progress. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isRecording])

  const loadSettings = async () => {
    try {
      const savedCameraId = await getSelectedCameraId()
      const savedMicrophoneId = await getSelectedMicrophoneId()
      const savedMode = await getRecordingMode()

      if (savedCameraId) {
        setSelectedCameraId(savedCameraId)
      }
      if (savedMicrophoneId) {
        setSelectedMicrophoneId(savedMicrophoneId)
      }
      if (savedMode) {
        setRecordingMode(savedMode as any)
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
    } catch (error) {
      console.error('Failed to load cameras:', error)
    }
  }

  const loadMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(
        (device) => device.kind === 'audioinput',
      )
      setMicrophones(audioDevices)
    } catch (error) {
      console.error('Failed to load microphones:', error)
    }
  }

  const handleStartRecording = async () => {
    try {
      const config = {
        mode: recordingMode,
        cameraId: selectedCameraId,
        microphoneId: selectedMicrophoneId,
      }

      await window.electronAPI.startRecording(config)
      setRecordingTime(0)
    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to start recording: ${errorMessage}`)
    }
  }

  const handleStopRecording = async () => {
    try {
      await window.electronAPI.stopRecording()
      // Navigate back to library after stopping
      router.navigate({ name: 'library' })
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-one">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Recording Mode Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-primary">Recording Mode</h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setRecordingMode('camera')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  recordingMode === 'camera'
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-medium">Camera</div>
              </button>
              <button
                onClick={() => setRecordingMode('screen')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  recordingMode === 'screen'
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="w-8 h-8 mx-auto mb-2 bg-secondary rounded" />
                <div className="text-sm font-medium">Screen</div>
              </button>
              <button
                onClick={() => setRecordingMode('both')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  recordingMode === 'both'
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="w-8 h-8 mx-auto mb-2 bg-secondary rounded" />
                <div className="text-sm font-medium">Both</div>
              </button>
            </div>
          </div>

          {/* Device Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-primary">Devices</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Camera
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background text-primary"
                >
                  <option value="">Default Camera</option>
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Microphone
                </label>
                <select
                  value={selectedMicrophoneId}
                  onChange={(e) => setSelectedMicrophoneId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background text-primary"
                >
                  <option value="">Default Microphone</option>
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex flex-col items-center space-y-4">
            {isRecording ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-mono text-accent mb-2">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-secondary">
                    Recording in progress...
                  </div>
                </div>
                <Button
                  onClick={handleStopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg flex items-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartRecording}
                className="bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
