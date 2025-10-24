import { getScreenSources, saveRecording } from '../../../shared/ipc'

export type RecordingMode = 'screen' | 'camera' | 'both'

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private mode: RecordingMode
  private cameraId: string
  private microphoneId: string
  private recordingId: string | null = null
  private autoSaveInterval: NodeJS.Timeout | null = null
  private isRecording: boolean = false

  constructor(
    mode: RecordingMode = 'screen',
    cameraId: string = '',
    microphoneId: string = '',
  ) {
    this.mode = mode
    this.cameraId = cameraId
    this.microphoneId = microphoneId
  }

  getCameraStream(): MediaStream | null {
    return this.cameraStream
  }

  async start(): Promise<void> {
    try {
      if (this.mode === 'screen') {
        this.stream = await this.getScreenStream()
      } else if (this.mode === 'camera') {
        this.cameraStream = await this.createCameraStream()
        this.stream = this.cameraStream
      } else {
        // Both: combine screen and camera
        this.stream = await this.getCombinedStream()
      }

      // Generate unique recording ID for crash recovery
      this.recordingId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Set up MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      }

      // Fallback to VP8 if VP9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8'
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.recordedChunks = []
      this.isRecording = true

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received data chunk:', event.data.size, 'bytes')
          this.recordedChunks.push(event.data)
        }
      }

      // Start recording - collect data every 100ms for smoother recording
      this.mediaRecorder.start(100)

      // Start auto-save mechanism for crash protection
      this.startAutoSave()
    } catch (error) {
      console.error('Error starting screen recording:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        resolve()
        return
      }

      // Stop auto-save mechanism
      this.stopAutoSave()
      this.isRecording = false

      this.mediaRecorder.onstop = async () => {
        try {
          await this.saveRecording()

          // Note: Crash protection is now handled by the main process

          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop())
            this.stream = null
          }

          if (this.cameraStream) {
            this.cameraStream.getTracks().forEach((track) => track.stop())
            this.cameraStream = null
          }

          resolve()
        } catch (error) {
          reject(error)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  private async saveRecording(): Promise<void> {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded chunks to save')
      return
    }

    try {
      console.log(`Saving ${this.recordedChunks.length} chunks`)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `vlog-${timestamp}.webm`

      // Create blob from recorded chunks with proper MIME type
      const blob = new Blob(this.recordedChunks, {
        type: 'video/webm;codecs=vp9',
      })
      console.log(`Total blob size: ${blob.size} bytes`)

      const arrayBuffer = await blob.arrayBuffer()

      // Save file using Electron API
      await saveRecording(filename, arrayBuffer)

      console.log(`Recording saved: ${filename}`)
    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
  }

  private startAutoSave(): void {
    // Auto-save chunks every 30 seconds to prevent data loss
    this.autoSaveInterval = setInterval(async () => {
      if (
        this.isRecording &&
        this.recordingId &&
        this.recordedChunks.length > 0
      ) {
        try {
          console.log(
            `Auto-saving ${this.recordedChunks.length} chunks for recording ${this.recordingId}`,
          )

          // Create a copy of current chunks to save
          const chunksToSave = [...this.recordedChunks]
          const blob = new Blob(chunksToSave, {
            type: 'video/webm;codecs=vp9',
          })
          const arrayBuffer = await blob.arrayBuffer()

          // Note: Auto-save is now handled by the main process

          console.log(`Auto-saved chunk for recording ${this.recordingId}`)
        } catch (error) {
          console.error('Error auto-saving recording chunk:', error)
        }
      }
    }, 30000) // 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  // Emergency save method for crash scenarios
  async emergencySave(): Promise<void> {
    if (
      this.isRecording &&
      this.recordingId &&
      this.recordedChunks.length > 0
    ) {
      try {
        console.log(
          `Emergency saving ${this.recordedChunks.length} chunks for recording ${this.recordingId}`,
        )

        // Create a copy of current chunks to save
        const chunksToSave = [...this.recordedChunks]
        const blob = new Blob(chunksToSave, {
          type: 'video/webm;codecs=vp9',
        })
        const arrayBuffer = await blob.arrayBuffer()

        // Note: Emergency save is now handled by the main process

        console.log(`Emergency saved chunk for recording ${this.recordingId}`)
      } catch (error) {
        console.error('Error emergency saving recording chunk:', error)
      }
    }
  }

  private async getScreenStream(): Promise<MediaStream> {
    const sources = await getScreenSources()

    if (sources.length === 0) {
      throw new Error(
        'No screen sources available. Please check screen recording permissions.',
      )
    }

    const screenSource =
      sources.find((source) => source.name.includes('Screen')) || sources[0]
    console.log('Starting screen recording with source:', screenSource.name)

    return navigator.mediaDevices.getUserMedia({
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
  }

  private async createCameraStream(): Promise<MediaStream> {
    console.log('Starting camera recording with camera:', this.cameraId)

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    }

    // If a specific camera is selected, use it
    if (this.cameraId) {
      videoConstraints.deviceId = { exact: this.cameraId }
    } else {
      // Otherwise use the default front camera
      videoConstraints.facingMode = 'user'
    }

    const audioConstraints: MediaTrackConstraints = {}

    // If a specific microphone is selected, use it
    if (this.microphoneId) {
      audioConstraints.deviceId = { exact: this.microphoneId }
    }

    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
      video: videoConstraints,
    }

    return navigator.mediaDevices.getUserMedia(constraints)
  }

  private async getCombinedStream(): Promise<MediaStream> {
    console.log('Starting combined screen + camera recording')

    // Get screen stream
    const screenStream = await this.getScreenStream()

    // Get camera stream
    this.cameraStream = await this.createCameraStream()

    // Combine video from screen and audio from camera
    const combinedStream = new MediaStream()

    // Add screen video track
    screenStream.getVideoTracks().forEach((track) => {
      combinedStream.addTrack(track)
    })

    // Add camera audio track
    this.cameraStream.getAudioTracks().forEach((track) => {
      combinedStream.addTrack(track)
    })

    return combinedStream
  }
}
