import { useCallback, useEffect, useRef, useState } from 'react'
import { RecordingMode } from '../../../types'
import { Recorder } from '../Recorder'
import { PreviewScreenRef } from '../PreviewScreen'

type RecordingState = 'idle' | 'recording' | 'paused'

interface Props {
  recordingMode: RecordingMode
  cameraId: string
  microphoneId: string
  previewRef: React.RefObject<PreviewScreenRef | null>
  onRecordingComplete: () => void
}

export function useRecording({
  recordingMode,
  cameraId,
  microphoneId,
  previewRef,
  onRecordingComplete,
}: Props) {
  const [recorder, setRecorder] = useState<Recorder | null>(null)
  const [state, setState] = useState<RecordingState>('idle')
  const [recordingTime, setRecordingTime] = useState(0)

  const isRecording = state !== 'idle'
  const isPaused = state === 'paused'

  const handleStopRecordingRef = useRef<(() => Promise<void>) | null>(null)
  const recorderRef = useRef<Recorder | null>(null)

  // Timer using actual elapsed time for accuracy
  const startTimeRef = useRef<number | null>(null)
  const accumulatedTimeRef = useRef<number>(0)

  useEffect(() => {
    if (state === 'recording') {
      startTimeRef.current = performance.now()

      const interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = (performance.now() - startTimeRef.current) / 1000
          setRecordingTime(accumulatedTimeRef.current + elapsed)
        }
      }, 64)

      return () => {
        if (startTimeRef.current !== null) {
          accumulatedTimeRef.current +=
            (performance.now() - startTimeRef.current) / 1000
          startTimeRef.current = null
        }
        clearInterval(interval)
      }
    }
  }, [state])

  // Crash protection - warn before leaving
  useEffect(() => {
    if (state === 'idle') {
      return
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Recording in progress. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state])

  // Handle stop recording request from main process
  useEffect(() => {
    if (state === 'idle') {
      return
    }

    const removeListener = window.electronAPI.onIpcEvent?.(
      'stop-recording-requested',
      () => {
        if (handleStopRecordingRef.current) {
          handleStopRecordingRef.current().catch(console.error)
        }
      },
    )

    return () => {
      if (removeListener) {
        removeListener()
      }
    }
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop().catch(console.error)
      }
    }
  }, [])

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
  }, [isRecording, recorder, recordingMode, previewRef])

  const start = useCallback(async () => {
    try {
      const newRecorder = new Recorder(recordingMode, cameraId, microphoneId)
      setRecorder(newRecorder)
      await newRecorder.start()
      accumulatedTimeRef.current = 0
      setState('recording')
      setRecordingTime(0)

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

      const errorContext =
        recordingMode === 'audio'
          ? '\n\nPlease check:\n1. Microphone permissions are granted\n2. No other apps are using the microphone'
          : '\n\nPlease check:\n1. Camera/Screen recording permissions are granted\n2. No other apps are using the camera/screen'

      alert(`Failed to start recording: ${errorMessage}${errorContext}`)
    }
  }, [recordingMode, cameraId, microphoneId, previewRef])

  const stop = useCallback(async () => {
    if (!recorder) {
      return
    }

    try {
      await recorder.stop()
      setState('idle')
      setRecorder(null)
      setRecordingTime(0)
      onRecordingComplete()
    } catch (error) {
      console.error('Failed to stop recording:', error)
      alert('Failed to stop recording.')
    }
  }, [recorder, onRecordingComplete])

  const togglePause = useCallback(() => {
    if (!recorder) {
      return
    }

    if (state === 'paused') {
      recorder.resume()
      setState('recording')
    } else {
      recorder.pause()
      setState('paused')
    }
  }, [recorder, state])

  // Keep refs updated
  useEffect(() => {
    handleStopRecordingRef.current = stop
  }, [stop])

  useEffect(() => {
    recorderRef.current = recorder
  }, [recorder])

  return {
    isRecording,
    isPaused,
    recordingTime,
    start,
    stop,
    togglePause,
  }
}
