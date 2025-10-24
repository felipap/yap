import assert from 'assert'
import { ipcMain } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getRecordingsDir } from '../lib/config'
import { debug } from '../lib/logger'
import { getRecordingWindow, recordingWindow } from '../windows'
import { RecordingConfig, RecordingState } from './types'

// Global recording state for background recording
let backgroundRecordingState: RecordingState = {
  isRecording: false,
  recordingId: null,
  startTime: null,
  duration: 0,
}

export async function startBackgroundRecording(
  config: RecordingConfig,
): Promise<string> {
  if (backgroundRecordingState.isRecording) {
    throw new Error('Background recording is already in progress')
  }

  assert(recordingWindow, 'Recording window not found')

  try {
    // Generate unique recording ID
    const recordingId = `background-recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Wait for the window to be ready
    await new Promise((resolve) => {
      recordingWindow!.webContents.once('dom-ready', resolve)
    })

    // Send start recording message to the recording window
    recordingWindow.webContents.postMessage('start-recording', recordingId)

    // Update state
    backgroundRecordingState = {
      isRecording: true,
      recordingId,
      startTime: Date.now(),
      duration: 0,
    }

    debug(`Background recording started: ${recordingId}`)
    return recordingId
  } catch (error) {
    backgroundRecordingState.isRecording = false
    const recordingWindow = getRecordingWindow()
    if (recordingWindow) {
      recordingWindow.close()
    }
    throw error
  }
}

export async function stopBackgroundRecording(): Promise<string> {
  if (!backgroundRecordingState.isRecording) {
    throw new Error('No background recording in progress')
  }

  try {
    const recordingWindow = getRecordingWindow()
    if (recordingWindow) {
      // Send stop recording message to the recording window
      recordingWindow.webContents.postMessage('stop-recording', '')

      // Close the recording window
      recordingWindow.close()
    }

    // Update state
    backgroundRecordingState = {
      isRecording: false,
      recordingId: null,
      startTime: null,
      duration: 0,
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `background-recording-${timestamp}.webm`

    debug(`Background recording stopped: ${filename}`)
    return filename
  } catch (error) {
    backgroundRecordingState.isRecording = false
    throw error
  }
}

async function saveRecordingToFile(buffer: ArrayBuffer): Promise<void> {
  try {
    // Save to recordings directory
    const recordingsDir = getRecordingsDir()
    await mkdir(recordingsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `background-recording-${timestamp}.webm`
    const filepath = join(recordingsDir, filename)

    await writeFile(filepath, Buffer.from(buffer))

    debug(`Background recording saved: ${filepath}`)
  } catch (error) {
    console.error('Error saving background recording:', error)
  }
}

export function getBackgroundRecordingState(): RecordingState {
  return { ...backgroundRecordingState }
}

export async function emergencySaveBackgroundRecording(): Promise<void> {
  if (
    backgroundRecordingState.isRecording &&
    backgroundRecordingState.recordingId
  ) {
    try {
      debug(
        `Emergency saving background recording: ${backgroundRecordingState.recordingId}`,
      )

      const recordingWindow = getRecordingWindow()
      if (recordingWindow) {
        recordingWindow.webContents.postMessage('stop-recording', '')
        recordingWindow.close()
      }
    } catch (error) {
      console.error('Error emergency saving background recording:', error)
    }
  }
}

// Set up IPC handlers for background recording
export function setupBackgroundRecordingIPC(): void {
  // Handle saving background recording
  ipcMain.handle(
    'save-background-recording',
    async (event, buffer: ArrayBuffer) => {
      await saveRecordingToFile(buffer)
    },
  )
}
