export type RecordingMode = 'screen' | 'camera' | 'both'

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null
  private mode: RecordingMode
  private cameraId: string

  constructor(mode: RecordingMode = 'screen', cameraId: string = '') {
    this.mode = mode
    this.cameraId = cameraId
  }

  async start(): Promise<void> {
    try {
      if (this.mode === 'screen') {
        this.stream = await this.getScreenStream()
      } else if (this.mode === 'camera') {
        this.stream = await this.getCameraStream()
      } else {
        // Both: combine screen and camera
        this.stream = await this.getCombinedStream()
      }

      // Set up MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      }

      // Fallback to VP8 if VP9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8'
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received data chunk:', event.data.size, 'bytes')
          this.recordedChunks.push(event.data)
        }
      }

      // Start recording - collect data every 100ms for smoother recording
      this.mediaRecorder.start(100)

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

      this.mediaRecorder.onstop = async () => {
        try {
          await this.saveRecording()

          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop())
            this.stream = null
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
      const blob = new Blob(this.recordedChunks, { type: 'video/webm;codecs=vp9' })
      console.log(`Total blob size: ${blob.size} bytes`)

      const arrayBuffer = await blob.arrayBuffer()

      // Save file using Electron API
      await window.electronAPI.saveRecording(filename, arrayBuffer)

      console.log(`Recording saved: ${filename}`)

    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
  }

  private async getScreenStream(): Promise<MediaStream> {
    const sources = await window.electronAPI.getScreenSources()

    if (sources.length === 0) {
      throw new Error('No screen sources available. Please check screen recording permissions.')
    }

    const screenSource = sources.find(source => source.name.includes('Screen')) || sources[0]
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
          maxHeight: 1080
        }
      }
    })
  }

  private async getCameraStream(): Promise<MediaStream> {
    console.log('Starting camera recording with camera:', this.cameraId)

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }

    // If a specific camera is selected, use it
    if (this.cameraId) {
      videoConstraints.deviceId = { exact: this.cameraId }
    } else {
      // Otherwise use the default front camera
      videoConstraints.facingMode = 'user'
    }

    const constraints: MediaStreamConstraints = {
      audio: true,
      video: videoConstraints
    }

    return navigator.mediaDevices.getUserMedia(constraints)
  }

  private async getCombinedStream(): Promise<MediaStream> {
    console.log('Starting combined screen + camera recording')

    // Get screen stream
    const screenStream = await this.getScreenStream()

    // Get camera stream
    const cameraStream = await this.getCameraStream()

    // Combine video from screen and audio from camera
    const combinedStream = new MediaStream()

    // Add screen video track
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track)
    })

    // Add camera audio track
    cameraStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track)
    })

    return combinedStream
  }
}

