// Renderer-side recording handler
// This script is loaded in the renderer process to handle recording operations

class RendererRecordingHandler {
  constructor() {
    this.mediaRecorder = null
    this.recordedChunks = []
    this.stream = null
    this.cameraStream = null
    this.currentRecordingId = null
    this.config = null
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Listen for recording commands from main process
    window.electronAPI.onIpcEvent('start-recording', async (data) => {
      try {
        await this.startRecording(data.recordingId, data.config)
      } catch (error) {
        console.error('Error starting recording:', error)
        // Send error back to main process
        // Note: We can't send errors back through IPC easily, just log them
        console.error('Recording error:', error.message)
      }
    })

    window.electronAPI.onIpcEvent('stop-recording', async (data) => {
      try {
        await this.stopRecording()
      } catch (error) {
        console.error('Error stopping recording:', error)
        // Send error back to main process
        // Note: We can't send errors back through IPC easily, just log them
        console.error('Recording stop error:', error.message)
      }
    })

    window.electronAPI.onIpcEvent('emergency-save-recording', async (data) => {
      try {
        await this.emergencySave()
      } catch (error) {
        console.error('Error emergency saving recording:', error)
      }
    })

    window.electronAPI.onIpcEvent('auto-save-recording', async (data) => {
      try {
        await this.autoSave()
      } catch (error) {
        console.error('Error auto-saving recording:', error)
      }
    })
  }

  async startRecording(recordingId, config) {
    this.currentRecordingId = recordingId
    this.config = config

    try {
      if (config.mode === 'screen') {
        this.stream = await this.getScreenStream()
      } else if (config.mode === 'camera') {
        this.cameraStream = await this.createCameraStream()
        this.stream = this.cameraStream
      } else {
        // Both: combine screen and camera
        this.stream = await this.getCombinedStream()
      }

      // Set up MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      }

      // Fallback to VP8 if VP9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
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

      console.log(`Recording started: ${recordingId}`)
    } catch (error) {
      console.error('Error starting screen recording:', error)
      throw error
    }
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        resolve()
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const filename = await this.saveRecording()

          // Clean up streams
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop())
            this.stream = null
          }

          if (this.cameraStream) {
            this.cameraStream.getTracks().forEach((track) => track.stop())
            this.cameraStream = null
          }

          // Notify main process
          // Note: We can't easily send completion back through IPC, just log it
          console.log('Recording completed:', filename)
          resolve()
        } catch (error) {
          // Note: We can't easily send errors back through IPC, just log them
          console.error('Recording completion error:', error.message)
          reject(error)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  async saveRecording() {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded chunks to save')
      return ''
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
      const vlogId = await window.electronAPI.saveRecording(
        filename,
        arrayBuffer,
      )

      console.log(`Recording saved: ${filename}`)
      return filename
    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
  }

  async emergencySave() {
    if (this.currentRecordingId && this.recordedChunks.length > 0) {
      try {
        console.log(
          `Emergency saving ${this.recordedChunks.length} chunks for recording ${this.currentRecordingId}`,
        )

        // Create a copy of current chunks to save
        const chunksToSave = [...this.recordedChunks]
        const blob = new Blob(chunksToSave, {
          type: 'video/webm;codecs=vp9',
        })
        const arrayBuffer = await blob.arrayBuffer()

        // Save chunk to temporary storage
        await window.electronAPI.saveRecordingChunk(
          this.currentRecordingId,
          arrayBuffer,
        )

        console.log(
          `Emergency saved chunk for recording ${this.currentRecordingId}`,
        )
      } catch (error) {
        console.error('Error emergency saving recording chunk:', error)
      }
    }
  }

  async autoSave() {
    if (this.currentRecordingId && this.recordedChunks.length > 0) {
      try {
        console.log(
          `Auto-saving ${this.recordedChunks.length} chunks for recording ${this.currentRecordingId}`,
        )

        // Create a copy of current chunks to save
        const chunksToSave = [...this.recordedChunks]
        const blob = new Blob(chunksToSave, {
          type: 'video/webm;codecs=vp9',
        })
        const arrayBuffer = await blob.arrayBuffer()

        // Save chunk to temporary storage
        await window.electronAPI.saveRecordingChunk(
          this.currentRecordingId,
          arrayBuffer,
        )

        console.log(`Auto-saved chunk for recording ${this.currentRecordingId}`)
      } catch (error) {
        console.error('Error auto-saving recording chunk:', error)
      }
    }
  }

  async getScreenStream() {
    const sources = await window.electronAPI.getScreenSources()

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

  async createCameraStream() {
    console.log('Starting camera recording with camera:', this.config?.cameraId)

    const videoConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    }

    // If a specific camera is selected, use it
    if (this.config?.cameraId) {
      videoConstraints.deviceId = { exact: this.config.cameraId }
    } else {
      // Otherwise use the default front camera
      videoConstraints.facingMode = 'user'
    }

    const audioConstraints = {}

    // If a specific microphone is selected, use it
    if (this.config?.microphoneId) {
      audioConstraints.deviceId = { exact: this.config.microphoneId }
    }

    const constraints = {
      audio: audioConstraints,
      video: videoConstraints,
    }

    return navigator.mediaDevices.getUserMedia(constraints)
  }

  async getCombinedStream() {
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

// Initialize the recording handler when the script loads
const recordingHandler = new RendererRecordingHandler()
