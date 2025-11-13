import { appendFile, mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { libraryWindow } from '../windows'
import { RecordingState } from './types'
import { Log } from '../../shared-types'
import { setVlog } from '../store'
import { getActiveRecordingsDir } from '../store/default-folder'
import { getVideoDuration } from '../lib/transcription'

// Global recording state - only one recording at a time
let recordingState: RecordingState = {
  isRecording: false,
  recordingId: null,
  startTime: null,
  duration: 0,
}

// Configuration for streaming recording
interface StreamingRecordingConfig {
  type: 'camera' | 'screen' | 'both' | 'audio'
  mimeType?: string
  audioBitsPerSecond?: number
  videoBitsPerSecond?: number
  audioEnabled?: boolean
  videoEnabled?: boolean
}

// Streaming recording state (only one at a time)
interface StreamingRecording {
  filepath: string
  filename: string
  chunks: Buffer[]
  config: StreamingRecordingConfig
}

let currentStreamingRecording: StreamingRecording | null = null

// Helper function to generate a unique ID for a vlog
function generateVlogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

// Helper function to generate a filename in the format "Log YYYY-MM-DD at H.MM.SS AM/PM.webm"
function generateRecordingFilename(config: StreamingRecordingConfig): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  // Convert to 12-hour format
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const ampm = hours >= 12 ? 'PM' : 'AM'

  // Add recording type to filename
  const typePrefix =
    config.type === 'camera'
      ? 'Camera'
      : config.type === 'screen'
        ? 'Screen'
        : config.type === 'audio'
          ? 'Audio'
          : 'Both'

  // Use .webm extension for all recordings (audio and video both use webm)
  return `${typePrefix} Log ${year}-${month}-${day} at ${hour12}.${minutes}.${seconds} ${ampm}.webm`
}

export function getRecordingState(): RecordingState {
  return { ...recordingState }
}

// Streaming recording functions
export async function startStreamingRecording(
  config: StreamingRecordingConfig,
): Promise<string> {
  // Ensure no existing streaming recording
  if (currentStreamingRecording) {
    throw new Error('A streaming recording is already in progress')
  }

  // Generate filename with the desired format
  const filename = generateRecordingFilename(config)

  // Create empty file to start with
  const recordingsDir = getActiveRecordingsDir()
  await mkdir(recordingsDir, { recursive: true })
  const filepath = join(recordingsDir, filename)
  await writeFile(filepath, Buffer.alloc(0))

  // Store the current streaming recording
  currentStreamingRecording = {
    filepath,
    filename,
    chunks: [],
    config,
  }

  return 'streaming' // Simple ID since there's only one
}

export async function appendRecordingChunk(chunk: ArrayBuffer): Promise<void> {
  if (!currentStreamingRecording) {
    throw new Error('No streaming recording in progress')
  }

  const buffer = Buffer.from(chunk)
  currentStreamingRecording.chunks.push(buffer)

  // Append chunk to file immediately
  await appendFile(currentStreamingRecording.filepath, buffer)
}

export async function finalizeStreamingRecording(): Promise<string> {
  if (!currentStreamingRecording) {
    throw new Error('No streaming recording in progress')
  }

  const filepath = currentStreamingRecording.filepath
  const filename = currentStreamingRecording.filename

  // Check video duration - don't save if less than 5 seconds
  const duration = await getVideoDuration(filepath)
  if (duration < 5) {
    console.log(
      `Recording too short (${duration}s), deleting file: ${filepath}`,
    )
    await unlink(filepath)
    currentStreamingRecording = null
    throw new Error('Recording too short (less than 5 seconds)')
  }

  // Generate unique ID for the vlog
  const id = generateVlogId(filepath)

  // Create vlog entry
  const vlog: Log = {
    id,
    name: filename,
    path: filepath,
    timestamp: new Date().toISOString(),
    isAudioOnly: currentStreamingRecording.config.type === 'audio',
  }
  setVlog(vlog)

  // Notify library window about the new vlog
  if (libraryWindow) {
    libraryWindow.webContents.send('vlog-added', {
      id,
      name: filename,
      path: filepath,
      timestamp: vlog.timestamp,
    })
  }

  // Clean up the streaming recording
  currentStreamingRecording = null

  return filepath
}

function notifyRecordingStateChange(): void {
  if (libraryWindow) {
    // Ensure we only send serializable data
    const serializableState = {
      isRecording: recordingState.isRecording,
      recordingId: recordingState.recordingId,
      startTime: recordingState.startTime,
      duration: recordingState.duration,
    }
    libraryWindow.webContents.send('recording-state-changed', serializableState)
  }
}
