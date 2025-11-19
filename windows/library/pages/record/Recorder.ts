import {
  getScreenSources,
  startStreamingRecording,
  appendRecordingChunk,
  finalizeStreamingRecording,
} from '../../../shared/ipc'

export type RecordingMode = 'screen' | 'camera' | 'both' | 'audio'

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private mode: RecordingMode
  private cameraId: string
  private microphoneId: string
  private recordedChunks: Blob[] = []
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
      } else if (this.mode === 'audio') {
        this.stream = await this.createAudioStream()
      } else {
        // Both: combine screen and camera
        this.stream = await this.getCombinedStream()
      }

      // Set up MediaRecorder
      const isAudioOnly = this.mode === 'audio'
      const options: MediaRecorderOptions = {}

      if (isAudioOnly) {
        // For audio-only, use audio/webm with opus codec
        options.mimeType = 'audio/webm;codecs=opus'
        options.audioBitsPerSecond = 128000 // 128 kbps for good quality audio

        // Fallback to plain audio/webm if opus is not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'audio/webm'
        }
      } else {
        // For video recording
        options.mimeType = 'video/webm;codecs=vp9'
        options.videoBitsPerSecond = 5000000

        // Fallback to VP8 if VP9 is not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm;codecs=vp8'
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.isRecording = true

      // Start streaming recording on backend with actual MediaRecorder config
      await startStreamingRecording({
        type: this.mode === 'audio' ? 'camera' : this.mode,
        mimeType: this.mediaRecorder.mimeType,
        audioBitsPerSecond: this.mediaRecorder.audioBitsPerSecond,
        videoBitsPerSecond: this.mediaRecorder.videoBitsPerSecond,
        audioEnabled: true,
        videoEnabled: !isAudioOnly,
      })
      console.log('Started streaming recording')

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log('Received data chunk:', event.data.size, 'bytes')
          this.recordedChunks.push(event.data)

          // Send chunk to backend immediately for crash protection
          try {
            const arrayBuffer = await event.data.arrayBuffer()
            await appendRecordingChunk(arrayBuffer)
          } catch (error) {
            console.error('Error sending chunk to backend:', error)
          }
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

      this.isRecording = false

      this.mediaRecorder.onstop = async () => {
        try {
          // Finalize streaming recording on backend
          try {
            const filepath = await finalizeStreamingRecording()
            console.log('Streaming recording finalized, saved to:', filepath)
          } catch (error) {
            // Silently handle errors (e.g., recording too short)
            console.log('Recording not saved:', error)
          }

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

  private async createAudioStream(): Promise<MediaStream> {
    console.log(
      'Starting audio-only recording with microphone:',
      this.microphoneId,
    )

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }

    // If a specific microphone is selected, use it
    if (this.microphoneId) {
      audioConstraints.deviceId = { exact: this.microphoneId }
    }

    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
      video: false,
    }

    return navigator.mediaDevices.getUserMedia(constraints)
  }
}
