// Background recording logic
let mediaRecorder = null
let recordedChunks = []
let stream = null

async function startRecording() {
  try {
    console.log('Starting background recording...')

    // Get screen sources from main process
    const sources = await window.electronAPI.getScreenSources()

    if (sources.length === 0) {
      throw new Error('No screen sources available')
    }

    // Get screen stream
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sources[0].id,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080,
        },
      },
    })

    // Set up MediaRecorder
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000,
    }

    // Fallback to VP8 if VP9 is not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8'
    }

    mediaRecorder = new MediaRecorder(stream, options)
    recordedChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(
          'Background recording - received data chunk:',
          event.data.size,
          'bytes',
        )
        recordedChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      await saveRecording()
    }

    // Start recording
    mediaRecorder.start(1000) // Collect data every second

    console.log('Background recording started')
  } catch (error) {
    console.error('Error starting background recording:', error)
  }
}

async function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    console.log('Background recording stopped')
  } catch (error) {
    console.error('Error stopping background recording:', error)
  }
}

async function saveRecording() {
  try {
    if (recordedChunks.length === 0) {
      console.log('No recording chunks to save')
      return
    }

    // Combine all chunks
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const buffer = await blob.arrayBuffer()

    // Send to main process to save
    await window.electronAPI.saveBackgroundRecording(buffer)

    console.log('Background recording saved')
  } catch (error) {
    console.error('Error saving background recording:', error)
  }
}

// Listen for messages from main process
window.addEventListener('message', (event) => {
  if (event.data === 'start-recording') {
    startRecording()
  } else if (event.data === 'stop-recording') {
    stopRecording()
  }
})

// Start recording when page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('Background recording window loaded')
  updateStatus('Script loaded')
})

function updateStatus(status) {
  const statusElement = document.getElementById('status')
  if (statusElement) {
    statusElement.textContent = status
  }
}
