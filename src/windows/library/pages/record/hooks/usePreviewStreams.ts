// Manages camera and screen preview streams for the recording page.
// Automatically starts/stops the appropriate stream based on recording mode,
// and cleans up streams when recording starts or component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getScreenSources } from '../../../../shared/ipc'
import { RecordingMode } from '../../../types'
import { PreviewScreenRef } from '../PreviewScreen'

interface UsePreviewStreamsOptions {
  recordingMode: RecordingMode
  selectedCameraId: string | null
  isRecording: boolean
  previewRef: React.RefObject<PreviewScreenRef | null>
}

export function usePreviewStreams({
  recordingMode,
  selectedCameraId,
  isRecording,
  previewRef,
}: UsePreviewStreamsOptions) {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  const cameraStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      setCameraStream(null)
    }
  }, [])

  const stopScreenStream = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
      setScreenStream(null)
    }
  }, [])

  const startCameraStream = useCallback(
    async (cameraId: string) => {
      stopCameraStream()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: cameraId ? { exact: cameraId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        cameraStreamRef.current = stream
        setCameraStream(stream)

        if (previewRef.current) {
          previewRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Failed to start camera preview:', error)
      }
    },
    [previewRef, stopCameraStream],
  )

  const startScreenStream = useCallback(async () => {
    stopScreenStream()

    try {
      const sources = await getScreenSources()

      if (sources.length === 0) {
        throw new Error(
          'No screen sources available. Please check screen recording permissions.',
        )
      }

      const screenSource =
        sources.find((source) => source.name.includes('Screen')) || sources[0]
      console.log('Starting screen preview with source:', screenSource.name)

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
      screenStreamRef.current = stream
      setScreenStream(stream)

      if (previewRef.current) {
        previewRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to start screen preview:', error)
    }
  }, [previewRef, stopScreenStream])

  const stopAll = useCallback(() => {
    stopCameraStream()
    stopScreenStream()
  }, [stopCameraStream, stopScreenStream])

  // Manage preview streams based on recording mode
  useEffect(() => {
    if (isRecording) {
      stopAll()
      return
    }

    if (recordingMode === 'camera' || recordingMode === 'both') {
      if (selectedCameraId) {
        startCameraStream(selectedCameraId)
      }
      stopScreenStream()
    } else if (recordingMode === 'screen') {
      startScreenStream()
      stopCameraStream()
    } else if (recordingMode === 'audio') {
      stopAll()
    }
  }, [
    recordingMode,
    selectedCameraId,
    isRecording,
    startCameraStream,
    startScreenStream,
    stopCameraStream,
    stopScreenStream,
    stopAll,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [stopAll])

  return {
    cameraStream,
    screenStream,
    stopAll,
  }
}
