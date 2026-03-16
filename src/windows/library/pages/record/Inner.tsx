import { useCallback, useEffect, useRef, useState } from 'react'
import { MicrophoneIcon } from '../../../shared/icons'
import {
  getRecordingMode,
  setRecordingMode as saveRecordingMode,
} from '../../../shared/ipc'
import { useRouter } from '../../../shared/Router'
import { VolumeMeter } from '../../../shared/ui/VolumeMeter'
import { RecordingMode } from '../../types'
import { PillButton, RecordButton } from './buttons'
import { DeviceSelector } from './DeviceSelector'
import { useCameras } from './hooks/useCameras'
import { useMicrophones } from './hooks/useMicrophones'
import { usePreviewStreams } from './hooks/usePreviewStreams'
import { PreviewScreen, PreviewScreenRef } from './PreviewScreen'
import { Recorder } from './Recorder'
import { RecordingModeSelector } from './RecordingModeSelector'

interface Props {
  close: () => void
}

export function RecordInner({ close }: Props) {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const { cameras, selectedCameraId, setSelectedCameraId, enableScreenFlash } =
    useCameras()
  const { microphones, selectedMicrophoneId, setSelectedMicrophoneId } =
    useMicrophones()
  const [recorder, setRecorder] = useState<Recorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const previewRef = useRef<PreviewScreenRef | null>(null)
  const handleStopRecordingRef = useRef<(() => Promise<void>) | null>(null)
  const recorderRef = useRef<Recorder | null>(null)

  usePreviewStreams({
    recordingMode,
    selectedCameraId,
    isRecording,
    previewRef,
  })

  useEffect(() => {
    if (!isRecording || isPaused) {
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
  }, [isRecording, isPaused, recorder])

  const loadSettings = useCallback(async () => {
    try {
      const savedMode = await getRecordingMode()
      if (savedMode) {
        setRecordingMode(savedMode)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  useEffect(() => {
    loadSettings()

    return () => {
      // Cleanup if component unmounts while recording
      if (recorderRef.current) {
        recorderRef.current.stop().catch(console.error)
      }
    }
  }, [loadSettings])

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

  const handleStartRecording = async () => {
    try {
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
      setIsPaused(false)
      setRecorder(null)
      setRecordingTime(0)
      router.navigate({ name: 'library' })
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
  }

  const handleTogglePause = () => {
    if (!recorder) {
      return
    }

    if (isPaused) {
      recorder.resume()
      setIsPaused(false)
    } else {
      recorder.pause()
      setIsPaused(true)
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
    <div className="flex flex-col h-full overflow-hidden dark:bg-one/40 bg-white/20">
      <div className="h-10  shrink-0 drag-region" />
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        {/* Preview Area */}
        <div className="flex flex-col items-center gap-4 w-full flex-1 min-h-0">
          <div className="relative w-full h-full">
            <PreviewScreen mode={recordingMode} ref={previewRef} />
          </div>
        </div>

        {/* Controls - Recording Mode Selection */}
        {!isRecording && (
          <div className="absolute flex flex-col gap-4 w-full shrink-0 z-10 px-4">
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
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative flex items-center justify-center py-4 px-6 shrink-0 h-[80px]">
        <div className="absolute left-6 flex items-center gap-3">
          {selectedMicrophoneId && (
            <>
              <MicrophoneIcon />
              <VolumeMeter
                microphoneId={selectedMicrophoneId}
                size="sm"
                showLabel={false}
              />
            </>
          )}
        </div>
        <RecordButton
          isRecording={isRecording}
          isPaused={isPaused}
          onStartRecording={handleStartRecording}
          onTogglePause={handleTogglePause}
        />
        {isRecording && !isPaused && (
          <div className="absolute right-6 text-[19px] font-medium text-contrast tabular-nums">
            {formatTime(recordingTime)}
          </div>
        )}
        {isRecording && isPaused && (
          <div className="absolute right-6">
            <PillButton onClick={handleStopRecording}>Done</PillButton>
          </div>
        )}
        {!isRecording && (
          <div className="absolute right-6">
            <PillButton onClick={close}>Library</PillButton>
          </div>
        )}
      </footer>
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
