import { useCallback, useEffect, useState } from 'react'
import {
  getSelectedCameraId,
  getStoredValue,
  setSelectedCameraId as saveSelectedCameraId,
  setStoredValue,
  updateCameraMenuState,
} from '../../../../shared/ipc'

export function useCameras() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [cameraAutoSelect, setCameraAutoSelect] = useState<boolean | null>(null)
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const savedCameraId = await getSelectedCameraId()
    const savedCameraAutoSelect =
      await getStoredValue<boolean>('cameraAutoSelect')
    const savedEnableScreenFlash =
      await getStoredValue<boolean>('enableScreenFlash')

    if (savedCameraId) {
      setSelectedCameraId(savedCameraId)
    }
    // Default to true if never set
    setCameraAutoSelect(savedCameraAutoSelect ?? true)
    if (savedEnableScreenFlash !== undefined) {
      setEnableScreenFlash(savedEnableScreenFlash)
    }
    setSettingsLoaded(true)
  }, [])

  const loadCameras = useCallback(
    async (savedCameraId?: string, autoSelect?: boolean) => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      )
      setCameras(videoDevices)

      if (videoDevices.length === 0) {
        setSelectedCameraId('')
        return
      }

      // If we have a saved camera ID and it exists, use it (unless auto-select is on)
      if (savedCameraId && !autoSelect) {
        const hasSavedCamera = videoDevices.some(
          (device) => device.deviceId === savedCameraId,
        )
        if (hasSavedCamera) {
          setSelectedCameraId(savedCameraId)
          return
        }
      }

      // Otherwise use first camera
      setSelectedCameraId(videoDevices[0].deviceId)
    },
    [],
  )

  // Load settings first, then cameras
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Load cameras after settings are loaded
  useEffect(() => {
    if (!settingsLoaded) {
      return
    }

    loadCameras(selectedCameraId, cameraAutoSelect ?? true)

    const handleDeviceChange = () => {
      loadCameras(selectedCameraId, cameraAutoSelect ?? true)
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
    }
  }, [settingsLoaded, loadCameras])

  // Save selected camera when it changes
  useEffect(() => {
    if (selectedCameraId) {
      saveSelectedCameraId(selectedCameraId)
    }
  }, [selectedCameraId])

  // Save auto-select preference when it changes
  useEffect(() => {
    if (cameraAutoSelect !== null) {
      setStoredValue('cameraAutoSelect', cameraAutoSelect).catch(console.error)
    }
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
    if (cameraAutoSelect === true && cameras.length > 0) {
      setSelectedCameraId(cameras[0].deviceId)
    }
  }, [cameraAutoSelect, cameras])

  // Update menu state when cameras or settings change
  useEffect(() => {
    if (cameraAutoSelect === null) {
      return
    }
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
