import assert from 'assert'
import { ipcMain } from 'electron'
import { appendFile, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getRecordingsDir } from '../lib/config'
import { debug } from '../lib/logger'
import { getRecordingWindow, recordingWindow } from '../windows'
import { RecordingConfig, RecordingState } from './types'

// Track streaming recordings
interface StreamingRecording {
  filepath: string
  filename: string
  chunks: Buffer[]
}

const streamingRecordings = new Map<string, StreamingRecording>()

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
  throw new Error('Not implemented')
}

export async function stopBackgroundRecording(): Promise<string> {
  throw new Error('Not implemented')
}

export function getBackgroundRecordingState(): RecordingState {
  return { ...backgroundRecordingState }
}

//
//
//

export async function startStreamingRecording(
  filename: string,
): Promise<string> {
  const recordingId = `streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Create empty file to start with
  const recordingsDir = getRecordingsDir()
  await mkdir(recordingsDir, { recursive: true })
  const filepath = join(recordingsDir, filename)
  await writeFile(filepath, Buffer.alloc(0))

  // Store the file path for this streaming recording
  streamingRecordings.set(recordingId, {
    filepath,
    filename,
    chunks: [],
  })

  return recordingId
}

export async function appendRecordingChunk(
  recordingId: string,
  chunk: ArrayBuffer,
): Promise<void> {
  const recording = streamingRecordings.get(recordingId)
  if (!recording) {
    throw new Error(`Streaming recording ${recordingId} not found`)
  }

  const buffer = Buffer.from(chunk)
  recording.chunks.push(buffer)

  // Append chunk to file immediately
  await appendFile(recording.filepath, buffer)
}

export async function finalizeStreamingRecording(
  recordingId: string,
): Promise<string> {
  const recording = streamingRecordings.get(recordingId)
  if (!recording) {
    throw new Error(`Streaming recording ${recordingId} not found`)
  }

  // Clean up the streaming recording
  streamingRecordings.delete(recordingId)

  return recording.filepath
}
