import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getStoredValue,
  getRecordingMode,
  getScreenSources,
  getSelectedCameraId,
  getSelectedMicrophoneId,
  setRecordingMode as saveRecordingMode,
  setStoredValue,
  setSelectedCameraId as saveSelectedCameraId,
  setSelectedMicrophoneId as saveSelectedMicrophoneId,
  updateCameraMenuState,
  updateMicrophoneMenuState,
} from '../../../shared/ipc'
import { useRouter } from '../../../shared/Router'
import { RecordButton } from './RecordButton'
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
  const [cameraAutoSelect, setCameraAutoSelect] = useState<boolean>(true)
  const [microphoneAutoSelect, setMicrophoneAutoSelect] =
    useState<boolean>(true)
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(true)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [screenPreviewStream, setScreenPreviewStream] =
    useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<Recorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const previewRef = useRef<PreviewScreenRef | null>(null)
  const handleStopRecordingRef = useRef<(() => Promise<void>) | null>(null)
  const recorderRef = useRef<Recorder | null>(null)

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

    // Listen for stop recording request from main process (when window is closed)
    const removeStopRecordingListener = window.electronAPI.onIpcEvent?.(
      'stop-recording-requested',
      () => {
        if (handleStopRecordingRef.current) {
          handleStopRecordingRef.current().catch(console.error)
        }
      },
    )

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (removeStopRecordingListener) {
        removeStopRecordingListener()
      }
    }
  }, [isRecording, recorder])

  const loadSettings = useCallback(async () => {
    try {
      const savedCameraId = await getSelectedCameraId()
      const savedMicrophoneId = await getSelectedMicrophoneId()
      const savedMode = await getRecordingMode()
      const savedCameraAutoSelect =
        await getStoredValue<boolean>('cameraAutoSelect')
      const savedMicrophoneAutoSelect = await getStoredValue<boolean>(
        'microphoneAutoSelect',
      )
      const savedEnableScreenFlash =
        await getStoredValue<boolean>('enableScreenFlash')

      if (savedCameraId) {
        setSelectedCameraId(savedCameraId)
      }
      if (savedMicrophoneId) {
        setSelectedMicrophoneId(savedMicrophoneId)
      }
      if (savedMode) {
        setRecordingMode(savedMode)
      }
      if (savedCameraAutoSelect !== undefined) {
        setCameraAutoSelect(savedCameraAutoSelect)
      }
      if (savedMicrophoneAutoSelect !== undefined) {
        setMicrophoneAutoSelect(savedMicrophoneAutoSelect)
      }
      if (savedEnableScreenFlash !== undefined) {
        setEnableScreenFlash(savedEnableScreenFlash)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const loadCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      )
      setCameras(videoDevices)
      setSelectedCameraId((previousCameraId) => {
        if (videoDevices.length === 0) {
          return ''
        }

        const hasPreviousCamera = videoDevices.some(
          (device) => device.deviceId === previousCameraId,
        )
        if (!previousCameraId || !hasPreviousCamera || cameraAutoSelect) {
          return videoDevices[0].deviceId
        }

        return previousCameraId
      })
    } catch (error) {
      console.error('Failed to load cameras:', error)
    }
  }, [cameraAutoSelect])

  const loadMicrophones = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(
        (device) => device.kind === 'audioinput',
      )
      setMicrophones(audioDevices)
      setSelectedMicrophoneId((previousMicrophoneId) => {
        if (audioDevices.length === 0) {
          return ''
        }

        const hasPreviousMicrophone = audioDevices.some(
          (device) => device.deviceId === previousMicrophoneId,
        )
        if (
          !previousMicrophoneId ||
          !hasPreviousMicrophone ||
          microphoneAutoSelect
        ) {
          return audioDevices[0].deviceId
        }

        return previousMicrophoneId
      })
    } catch (error) {
      console.error('Failed to load microphones:', error)
    }
  }, [microphoneAutoSelect])

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
    loadCameras()
    loadMicrophones()
    loadSettings()

    const handleDeviceChange = () => {
      loadCameras()
      loadMicrophones()
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
      stopCameraPreview()
      stopScreenPreview()
      // Cleanup if component unmounts while recording
      if (recorderRef.current) {
        // Force stop recording and save any recorded data
        recorderRef.current.stop().catch(console.error)
      }
    }
  }, [loadCameras, loadMicrophones, loadSettings])

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

  useEffect(() => {
    setStoredValue('cameraAutoSelect', cameraAutoSelect).catch(console.error)
  }, [cameraAutoSelect])

  useEffect(() => {
    setStoredValue('microphoneAutoSelect', microphoneAutoSelect).catch(
      console.error,
    )
  }, [microphoneAutoSelect])

  useEffect(() => {
    setStoredValue('enableScreenFlash', enableScreenFlash).catch(console.error)
  }, [enableScreenFlash])

  useEffect(() => {
    const removeCameraSelectionListener = window.electronAPI.onIpcEvent?.(
      'camera-menu-selected',
      (cameraId: string) => {
        setSelectedCameraId(cameraId)
      },
    )
    const removeAutoSelectionListener = window.electronAPI.onIpcEvent?.(
      'camera-menu-auto-selection-changed',
      (enabled: boolean) => {
        setCameraAutoSelect(enabled)
      },
    )
    const removeMicrophoneSelectionListener = window.electronAPI.onIpcEvent?.(
      'microphone-menu-selected',
      (microphoneId: string) => {
        setSelectedMicrophoneId(microphoneId)
      },
    )
    const removeMicrophoneAutoSelectionListener =
      window.electronAPI.onIpcEvent?.(
        'microphone-menu-auto-selection-changed',
        (enabled: boolean) => {
          setMicrophoneAutoSelect(enabled)
        },
      )
    const removeScreenFlashListener = window.electronAPI.onIpcEvent?.(
      'camera-menu-screen-flash-changed',
      (payload: { enabled: boolean }) => {
        setEnableScreenFlash(payload.enabled)
      },
    )

    return () => {
      if (removeCameraSelectionListener) {
        removeCameraSelectionListener()
      }
      if (removeAutoSelectionListener) {
        removeAutoSelectionListener()
      }
      if (removeMicrophoneSelectionListener) {
        removeMicrophoneSelectionListener()
      }
      if (removeMicrophoneAutoSelectionListener) {
        removeMicrophoneAutoSelectionListener()
      }
      if (removeScreenFlashListener) {
        removeScreenFlashListener()
      }
    }
  }, [])

  useEffect(() => {
    if (cameraAutoSelect && cameras.length > 0) {
      setSelectedCameraId(cameras[0].deviceId)
    }
  }, [cameraAutoSelect, cameras])

  useEffect(() => {
    if (microphoneAutoSelect && microphones.length > 0) {
      setSelectedMicrophoneId(microphones[0].deviceId)
    }
  }, [microphoneAutoSelect, microphones])

  useEffect(() => {
    updateCameraMenuState({
      cameras: cameras.map((camera) => ({
        id: camera.deviceId,
        label: camera.label || `Camera ${camera.deviceId.slice(0, 8)}...`,
      })),
      selectedCameraId,
      automaticCameraSelection: cameraAutoSelect,
      enableScreenFlash,
    }).catch(console.error)
  }, [cameras, selectedCameraId, cameraAutoSelect, enableScreenFlash])

  useEffect(() => {
    updateMicrophoneMenuState({
      microphones: microphones.map((microphone) => ({
        id: microphone.deviceId,
        label:
          microphone.label ||
          `Microphone ${microphone.deviceId.slice(0, 8)}...`,
      })),
      selectedMicrophoneId,
      automaticMicrophoneSelection: microphoneAutoSelect,
    }).catch(console.error)
  }, [microphones, selectedMicrophoneId, microphoneAutoSelect])

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

  // Keep ref updated with latest handleStopRecording
  useEffect(() => {
    handleStopRecordingRef.current = handleStopRecording
  }, [recorder])

  useEffect(() => {
    recorderRef.current = recorder
  }, [recorder])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-one/40">
      <div className="flex-1 flex flex-col items-center justify-center pb-4 gap-4 min-h-0">
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
        <div className="flex flex-col gap-4 w-full shrink-0 z-10 px-4">
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
          {/* {!isRecording && ( */}
          {false && (
            <DeviceSelector
              cameras={cameras}
              microphones={microphones}
              selectedCameraId={selectedCameraId}
              selectedMicrophoneId={selectedMicrophoneId}
              onCameraChange={setSelectedCameraId}
              onMicrophoneChange={setSelectedMicrophoneId}
              recordingMode={recordingMode}
            />
          )}

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
