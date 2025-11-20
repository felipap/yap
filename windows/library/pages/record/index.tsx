import { useEffect, useRef, useState } from 'react'
import {
  getRecordingMode,
  getScreenSources,
  getSelectedCameraId,
  getSelectedMicrophoneId,
  setRecordingMode as saveRecordingMode,
  setSelectedCameraId as saveSelectedCameraId,
  setSelectedMicrophoneId as saveSelectedMicrophoneId,
} from '../../../shared/ipc'
import { useRouter } from '../../../shared/Router'
import { RecordButton } from '../../components/RecordButton'
import { RecordingMode } from '../../types'
import { DeviceSelector } from './DeviceSelector'
import { PreviewScreen, PreviewScreenRef } from './PreviewScreen'
import { Recorder } from './Recorder'
import { RecordingModeSelector } from './RecordingModeSelector'
import { VolumeMeter } from './VolumeMeter'

export default function Page() {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [screenPreviewStream, setScreenPreviewStream] =
    useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<Recorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const previewRef = useRef<PreviewScreenRef | null>(null)

  useEffect(() => {
    loadCameras()
    loadMicrophones()
    loadSettings()

    return () => {
      stopCameraPreview()
      stopScreenPreview()
      // Cleanup if component unmounts while recording
      if (recorder) {
        // Force stop recording and save any recorded data
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

    // Add beforeunload handler for crash protection
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (recorder && isRecording) {
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
  }, [isRecording, recorder])

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

  const loadMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(
        (device) => device.kind === 'audioinput',
      )
      setMicrophones(audioDevices)
      if (audioDevices.length > 0 && !selectedMicrophoneId) {
        setSelectedMicrophoneId(audioDevices[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to load microphones:', error)
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

      if (previewRef.current) {
        previewRef.current.srcObject = stream
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

  const startScreenPreview = async () => {
    try {
      // Stop any existing screen preview
      if (screenPreviewStream) {
        screenPreviewStream.getTracks().forEach((track) => track.stop())
      }

      // Get screen sources
      const sources = await getScreenSources()

      if (sources.length === 0) {
        throw new Error(
          'No screen sources available. Please check screen recording permissions.',
        )
      }

      const screenSource =
        sources.find((source) => source.name.includes('Screen')) || sources[0]
      console.log('Starting screen preview with source:', screenSource.name)

      // Start screen preview
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        },
      })
      setScreenPreviewStream(stream)

      if (previewRef.current) {
        previewRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to start screen preview:', error)
    }
  }

  const stopScreenPreview = () => {
    if (screenPreviewStream) {
      screenPreviewStream.getTracks().forEach((track) => track.stop())
      setScreenPreviewStream(null)
    }
  }

  useEffect(() => {
    if (!isRecording) {
      if (recordingMode === 'camera' || recordingMode === 'both') {
        if (selectedCameraId) {
          startCameraPreview(selectedCameraId)
        }
        stopScreenPreview()
      } else if (recordingMode === 'screen') {
        startScreenPreview()
        stopCameraPreview()
      } else if (recordingMode === 'audio') {
        // Audio mode doesn't need any preview
        stopCameraPreview()
        stopScreenPreview()
      }
    } else {
      stopCameraPreview()
      stopScreenPreview()
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
      if (previewRef.current && cameraStream) {
        previewRef.current.srcObject = cameraStream
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
    if (selectedMicrophoneId) {
      saveSelectedMicrophoneId(selectedMicrophoneId)
    }
  }, [selectedMicrophoneId])

  const handleStartRecording = async () => {
    try {
      // Start recording first
      const newRecorder = new Recorder(
        recordingMode,
        selectedCameraId,
        selectedMicrophoneId,
      )
      setRecorder(newRecorder)
      await newRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Set up camera preview for recording (if camera is involved)
      if (recordingMode === 'camera' || recordingMode === 'both') {
        const cameraStream = newRecorder.getCameraStream()
        if (previewRef.current && cameraStream) {
          previewRef.current.srcObject = cameraStream
        }
      }

      // Stop preview stream after new stream is set up
      stopCameraPreview()
    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'

      let errorContext = ''
      if (recordingMode === 'audio') {
        errorContext =
          '\n\nPlease check:\n1. Microphone permissions are granted\n2. No other apps are using the microphone'
      } else {
        errorContext =
          '\n\nPlease check:\n1. Camera/Screen recording permissions are granted\n2. No other apps are using the camera/screen'
      }

      alert(`Failed to start recording: ${errorMessage}${errorContext}`)
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-one">
      <div className="flex-1 flex flex-col items-center justify-center px-3 pb-4 gap-4 min-h-0">
        {/* Preview Area */}
        <div className="flex flex-col items-center gap-4 w-full flex-1 min-h-0">
          <div className="relative w-full h-full">
            <PreviewScreen mode={recordingMode} ref={previewRef} />

            {/* Duration Timer during recording */}
            {isRecording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="text-[32px] font-bold text-white tabular-nums drop-shadow-lg">
                  {formatTime(recordingTime)}
                </div>
              </div>
            )}

            {/* Volume Meter during recording */}
            {isRecording && selectedMicrophoneId && (
              <div className="absolute top-4 right-8 z-10">
                <VolumeMeter
                  microphoneId={selectedMicrophoneId}
                  size="sm"
                  showLabel={false}
                  className="w-[20px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 w-full shrink-0 z-10">
          {/* Recording Mode Selection */}
          <RecordingModeSelector
            recordingMode={recordingMode}
            onModeChange={(mode) => {
              setRecordingMode(mode)
              saveRecordingMode(mode)
            }}
            isRecording={isRecording}
          />

          {/* Device Selection */}
          {!isRecording && <DeviceSelector
            cameras={cameras}
            microphones={microphones}
            selectedCameraId={selectedCameraId}
            selectedMicrophoneId={selectedMicrophoneId}
            onCameraChange={setSelectedCameraId}
            onMicrophoneChange={setSelectedMicrophoneId}
            recordingMode={recordingMode}
          />}

          {/* Recording Button */}
          <RecordButton
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </div>
      </div>
    </div>
  )
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
