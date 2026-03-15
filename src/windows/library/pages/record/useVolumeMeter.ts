import { useEffect, useRef, useState } from 'react'

export interface VolumeMeterOptions {
  microphoneId?: string
  smoothingFactor?: number
  updateInterval?: number
}

export interface VolumeData {
  volume: number // 0-1
  isActive: boolean
  isMuted: boolean
}

export function useVolumeMeter(options: VolumeMeterOptions = {}) {
  const { microphoneId, smoothingFactor = 0.8, updateInterval = 50 } = options

  const [volumeData, setVolumeData] = useState<VolumeData>({
    volume: 0,
    isActive: false,
    isMuted: false,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastVolumeRef = useRef(0)

  const startMonitoring = async () => {
    try {
      // Stop existing monitoring
      stopMonitoring()

      // Create audio context
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)()

      // Get microphone stream
      const constraints: MediaStreamConstraints = {
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Create audio source and analyser
      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()

      // Configure analyser
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = smoothingFactor

      // Connect nodes
      microphoneRef.current.connect(analyserRef.current)

      // Start monitoring loop
      monitorVolume()

      setVolumeData((prev) => ({ ...prev, isActive: true }))
    } catch (error) {
      console.error('Failed to start volume monitoring:', error)
      setVolumeData((prev) => ({ ...prev, isActive: false }))
    }
  }

  const stopMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect()
      microphoneRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    lastVolumeRef.current = 0

    setVolumeData({
      volume: 0,
      isActive: false,
      isMuted: false,
    })
  }

  const monitorVolume = () => {
    if (!analyserRef.current) {
      return
    }

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate RMS (Root Mean Square) for better volume representation
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / bufferLength)
    const volume = rms / 255

    // Apply smoothing to reduce jitter
    const smoothedVolume =
      lastVolumeRef.current * smoothingFactor + volume * (1 - smoothingFactor)
    lastVolumeRef.current = smoothedVolume

    // Check if audio is muted (very low volume for extended period)
    const isMuted = smoothedVolume < 0.01

    setVolumeData({
      volume: smoothedVolume,
      isActive: true,
      isMuted,
    })

    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(monitorVolume)
  }

  // Start monitoring when microphoneId changes
  useEffect(() => {
    if (microphoneId) {
      startMonitoring()
    } else {
      stopMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [microphoneId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [])

  return {
    volumeData,
    startMonitoring,
    stopMonitoring,
  }
}
