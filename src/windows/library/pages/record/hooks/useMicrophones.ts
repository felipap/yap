import { useCallback, useEffect, useState } from 'react'
import {
  getSelectedMicrophoneId,
  getStoredValue,
  setSelectedMicrophoneId as saveSelectedMicrophoneId,
  setStoredValue,
  updateMicrophoneMenuState,
} from '../../../../shared/ipc'

export function useMicrophones() {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('')
  const [microphoneAutoSelect, setMicrophoneAutoSelect] = useState<boolean>(true)

  const loadSettings = useCallback(async () => {
    const savedMicrophoneId = await getSelectedMicrophoneId()
    const savedMicrophoneAutoSelect = await getStoredValue<boolean>(
      'microphoneAutoSelect',
    )

    if (savedMicrophoneId) {
      setSelectedMicrophoneId(savedMicrophoneId)
    }
    if (savedMicrophoneAutoSelect !== undefined) {
      setMicrophoneAutoSelect(savedMicrophoneAutoSelect)
    }
  }, [])

  const loadMicrophones = useCallback(async () => {
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
  }, [microphoneAutoSelect])

  // Load microphones and settings on mount
  useEffect(() => {
    loadMicrophones()
    loadSettings()

    const handleDeviceChange = () => {
      loadMicrophones()
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
    }
  }, [loadMicrophones, loadSettings])

  // Save selected microphone when it changes
  useEffect(() => {
    if (selectedMicrophoneId) {
      saveSelectedMicrophoneId(selectedMicrophoneId)
    }
  }, [selectedMicrophoneId])

  // Save auto-select preference when it changes
  useEffect(() => {
    setStoredValue('microphoneAutoSelect', microphoneAutoSelect).catch(
      console.error,
    )
  }, [microphoneAutoSelect])

  // Listen for menu events
  useEffect(() => {
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

    return () => {
      if (removeMicrophoneSelectionListener) {
        removeMicrophoneSelectionListener()
      }
      if (removeMicrophoneAutoSelectionListener) {
        removeMicrophoneAutoSelectionListener()
      }
    }
  }, [])

  // Auto-select first microphone when auto-select is enabled
  useEffect(() => {
    if (microphoneAutoSelect && microphones.length > 0) {
      setSelectedMicrophoneId(microphones[0].deviceId)
    }
  }, [microphoneAutoSelect, microphones])

  // Update menu state when microphones or settings change
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

  return {
    microphones,
    selectedMicrophoneId,
    setSelectedMicrophoneId,
    microphoneAutoSelect,
    setMicrophoneAutoSelect,
  }
}
