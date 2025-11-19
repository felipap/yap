/**
 * Real-time audio silence detection using Web Audio API
 */

export interface SilenceDetectionConfig {
  // Volume threshold below which audio is considered silent (0-1)
  silenceThreshold: number
  // How long silence must last before skipping (in seconds)
  minSilenceDuration: number
  // How often to check for silence (in milliseconds)
  checkInterval: number
  // How far to skip ahead when silence is detected (in seconds)
  skipAheadDuration: number
}

const DEFAULT_CONFIG: SilenceDetectionConfig = {
  silenceThreshold: 0.01, // Very quiet = silence
  minSilenceDuration: 1.0, // Must be silent for 1 second
  checkInterval: 100, // Check every 100ms
  skipAheadDuration: 0.5, // Skip ahead 0.5s when silence detected
}

export class AudioSilenceDetector {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private silenceStartTime: number | null = null
  private config: SilenceDetectionConfig
  private videoElement: HTMLVideoElement | null = null
  private onSkip?: (fromTime: number, toTime: number) => void

  constructor(
    config: Partial<SilenceDetectionConfig> = {},
    onSkip?: (fromTime: number, toTime: number) => void,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onSkip = onSkip
  }

  /**
   * Connect to a video element to analyze its audio
   */
  connect(videoElement: HTMLVideoElement): void {
    this.disconnect()
    this.videoElement = videoElement

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.8

      // Create source from video element
      this.sourceNode = this.audioContext.createMediaElementSource(videoElement)

      // Connect: source -> analyser -> destination (speakers)
      this.sourceNode.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      // Prepare data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
    } catch (error) {
      console.error('Failed to connect audio analyser:', error)
      this.disconnect()
    }
  }

  /**
   * Start monitoring for silence
   */
  start(): void {
    if (!this.analyser || !this.dataArray || !this.videoElement) {
      return
    }

    this.stop() // Clear any existing interval

    this.checkInterval = setInterval(() => {
      this.checkSilence()
    }, this.config.checkInterval)
  }

  /**
   * Stop monitoring for silence
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.silenceStartTime = null
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stop()

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.dataArray = null
    this.videoElement = null
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SilenceDetectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Check current audio level and skip if silent
   */
  private checkSilence(): void {
    if (
      !this.analyser ||
      !this.dataArray ||
      !this.videoElement ||
      this.videoElement.paused ||
      this.videoElement.ended
    ) {
      return
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray)

    // Calculate RMS (Root Mean Square) for volume
    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i]
    }
    const rms = Math.sqrt(sum / this.dataArray.length)
    const volume = rms / 255 // Normalize to 0-1

    const isSilent = volume < this.config.silenceThreshold

    if (isSilent) {
      // Start tracking silence
      if (this.silenceStartTime === null) {
        this.silenceStartTime = this.videoElement.currentTime
      } else {
        // Check if we've been silent long enough
        const silenceDuration =
          this.videoElement.currentTime - this.silenceStartTime

        if (silenceDuration >= this.config.minSilenceDuration) {
          // Skip ahead!
          const fromTime = this.videoElement.currentTime
          const toTime = fromTime + this.config.skipAheadDuration

          // Don't skip past the end of the video
          if (toTime < this.videoElement.duration) {
            this.videoElement.currentTime = toTime
            this.onSkip?.(fromTime, toTime)
          }

          // Reset silence tracking after skip
          this.silenceStartTime = null
        }
      }
    } else {
      // Not silent anymore, reset tracking
      this.silenceStartTime = null
    }
  }

  /**
   * Get current audio volume (for debugging)
   */
  getCurrentVolume(): number {
    if (!this.analyser || !this.dataArray) {
      return 0
    }

    this.analyser.getByteFrequencyData(this.dataArray)

    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i]
    }
    const rms = Math.sqrt(sum / this.dataArray.length)
    return rms / 255
  }
}


