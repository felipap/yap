import { useEffect, useRef } from 'react'
import { AudioSilenceDetector } from './audioSilenceDetection'

interface UseAudioSilenceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>
  vlogId: string
  skipSilence: boolean
  silenceThreshold: number
  minSilenceDuration: number
}

export function useAudioSilenceDetection({
  videoRef,
  vlogId,
  skipSilence,
  silenceThreshold,
  minSilenceDuration,
}: UseAudioSilenceDetectionProps) {
  const silenceDetectorRef = useRef<AudioSilenceDetector | null>(null)

  // Initialize audio silence detector
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    // Create detector with callback for skip events
    const detector = new AudioSilenceDetector(
      {
        silenceThreshold,
        minSilenceDuration,
        skipAheadDuration: 0.5, // Skip 0.5s ahead when detected
      },
      (fromTime, toTime) => {
        console.log(
          `Skipped silence: ${fromTime.toFixed(1)}s → ${toTime.toFixed(1)}s`,
        )
      },
    )

    // Connect to video element's audio
    // Note: This can only be called after user interaction due to browser autoplay policies
    const initAudioContext = () => {
      if (!silenceDetectorRef.current) {
        try {
          detector.connect(video)
          silenceDetectorRef.current = detector
          console.log('Audio silence detector connected')
        } catch (error) {
          console.error('Failed to connect audio silence detector:', error)
        }
      }
    }

    // Try to initialize on play event (ensures user interaction)
    video.addEventListener('play', initAudioContext, { once: true })

    return () => {
      if (silenceDetectorRef.current) {
        silenceDetectorRef.current.disconnect()
        silenceDetectorRef.current = null
      }
    }
  }, [vlogId, silenceThreshold, minSilenceDuration, videoRef])

  // Update detector config when preferences change
  useEffect(() => {
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.updateConfig({
        silenceThreshold,
        minSilenceDuration,
      })
    }
  }, [silenceThreshold, minSilenceDuration])

  // Control silence detection based on skipSilence preference
  useEffect(() => {
    const detector = silenceDetectorRef.current
    if (!detector) {
      return
    }

    if (skipSilence) {
      detector.start()
      console.log('Silence skipping enabled')
    } else {
      detector.stop()
      console.log('Silence skipping disabled')
    }
  }, [skipSilence])
}

