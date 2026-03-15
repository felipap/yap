import { useCallback, useEffect, useState } from 'react'
import {
  getSelectedCameraId,
  getStoredValue,
  setSelectedCameraId as saveSelectedCameraId,
  setStoredValue,
  updateCameraMenuState,
} from '../../../shared/ipc'

export function useCameras() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [cameraAutoSelect, setCameraAutoSelect] = useState<boolean>(true)
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(true)

  const loadSettings = useCallback(async () => {
    const savedCameraId = await getSelectedCameraId()
    const savedCameraAutoSelect =
      await getStoredValue<boolean>('cameraAutoSelect')
    const savedEnableScreenFlash =
      await getStoredValue<boolean>('enableScreenFlash')

    if (savedCameraId) {
      setSelectedCameraId(savedCameraId)
    }
    if (savedCameraAutoSelect !== undefined) {
      setCameraAutoSelect(savedCameraAutoSelect)
    }
    if (savedEnableScreenFlash !== undefined) {
      setEnableScreenFlash(savedEnableScreenFlash)
    }
  }, [])

  const loadCameras = useCallback(async () => {
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
  }, [cameraAutoSelect])

  // Load cameras and settings on mount
  useEffect(() => {
    loadCameras()
    loadSettings()

    const handleDeviceChange = () => {
      loadCameras()
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
    }
  }, [loadCameras, loadSettings])

  // Save selected camera when it changes
  useEffect(() => {
    if (selectedCameraId) {
      saveSelectedCameraId(selectedCameraId)
    }
  }, [selectedCameraId])

  // Save auto-select preference when it changes
  useEffect(() => {
    setStoredValue('cameraAutoSelect', cameraAutoSelect).catch(console.error)
  }, [cameraAutoSelect])

  // Save screen flash preference when it changes
  useEffect(() => {
    setStoredValue('enableScreenFlash', enableScreenFlash).catch(console.error)
  }, [enableScreenFlash])

  // Listen for menu events
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
      if (removeScreenFlashListener) {
        removeScreenFlashListener()
      }
    }
  }, [])

  // Auto-select first camera when auto-select is enabled
  useEffect(() => {
    if (cameraAutoSelect && cameras.length > 0) {
      setSelectedCameraId(cameras[0].deviceId)
    }
  }, [cameraAutoSelect, cameras])

  // Update menu state when cameras or settings change
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

  return {
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    cameraAutoSelect,
    setCameraAutoSelect,
    enableScreenFlash,
    setEnableScreenFlash,
  }
}
