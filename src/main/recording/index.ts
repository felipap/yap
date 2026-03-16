import { spawn } from 'child_process'
import { appendFile, mkdir, rename, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { Log } from '../../shared-types'
import { findFFmpegPath, getFFmpegEnv } from '../lib/ffmpeg'
import { moveToTrash } from '../lib/filesystem'
import { debug } from '../lib/logger'
import { getVideoDuration } from '../lib/transcription'
import { appendLog, generateLogId, setLog } from '../store'
import { getActiveRecordingsDir } from '../store/default-folder'
import { libraryWindow } from '../windows'

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
  config: StreamingRecordingConfig
}

let currentStreamingRecording: StreamingRecording | null = null

function generateRecordingFilename(config: StreamingRecordingConfig): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const ampm = hours >= 12 ? 'PM' : 'AM'

  const typePrefix =
    config.type === 'camera'
      ? 'Camera'
      : config.type === 'screen'
        ? 'Screen'
        : config.type === 'audio'
          ? 'Audio'
          : 'Both'

  const ext = config.mimeType?.startsWith('video/mp4') ? 'mp4' : 'webm'
  return `${typePrefix} Log ${year}-${month}-${day} at ${hour12}.${minutes}.${seconds} ${ampm}.${ext}`
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
    config,
  }

  return 'streaming' // Simple ID since there's only one
}

export async function appendRecordingChunk(chunk: ArrayBuffer): Promise<void> {
  if (!currentStreamingRecording) {
    throw new Error('No streaming recording in progress')
  }

  const buffer = Buffer.from(chunk)
  await appendFile(currentStreamingRecording.filepath, buffer)
}

/**
 * Remux a video file using ffmpeg to fix audio/video sync issues.
 * This is necessary because MediaRecorder's timeslice mode can produce
 * files with sync problems when chunks are concatenated.
 */
async function remuxVideoFile(inputPath: string): Promise<string> {
  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    debug('ffmpeg not available, skipping remux')
    return inputPath
  }

  const tempPath = inputPath.replace(/\.(mp4|webm)$/, '.temp.$1')

  return new Promise((resolve) => {
    const ffmpeg = spawn(
      ffmpegPath,
      [
        '-i',
        inputPath,
        '-c',
        'copy', // Copy streams without re-encoding (fast)
        '-movflags',
        '+faststart', // Optimize for streaming/seeking
        '-y', // Overwrite output
        tempPath,
      ],
      { env: getFFmpegEnv() },
    )

    let errorOutput = ''

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        // Replace original with remuxed version
        try {
          await unlink(inputPath)
          await rename(tempPath, inputPath)
          debug('Successfully remuxed video file for sync fix')
          resolve(inputPath)
        } catch (error) {
          debug('Error replacing original with remuxed file:', error)
          // Try to clean up temp file
          try {
            await unlink(tempPath)
          } catch {
            // Ignore cleanup errors
          }
          resolve(inputPath)
        }
      } else {
        debug('ffmpeg remux failed:', errorOutput)
        // Try to clean up temp file
        try {
          await unlink(tempPath)
        } catch {
          // Ignore cleanup errors
        }
        resolve(inputPath)
      }
    })

    ffmpeg.on('error', (error) => {
      debug('Failed to start ffmpeg for remux:', error)
      resolve(inputPath)
    })
  })
}

export async function finalizeStreamingRecording(): Promise<string> {
  if (!currentStreamingRecording) {
    throw new Error('No streaming recording in progress')
  }

  let filepath = currentStreamingRecording.filepath
  const filename = currentStreamingRecording.filename
  const isAudioOnly = currentStreamingRecording.config.type === 'audio'

  // Remux video files to fix audio/video sync issues caused by MediaRecorder timeslice mode
  if (!isAudioOnly) {
    filepath = await remuxVideoFile(filepath)
  }

  // Check video duration and don't save if less than 5 seconds.
  let duration = null
  try {
    duration = await getVideoDuration(filepath)
  } catch (error) {
    console.error('Error getting video duration. Will continue.', error)
    duration = null
  }

  if (duration && duration < 5) {
    debug(`Recording too short (${duration}s), moving to trash: ${filepath}`)
    await moveToTrash(filepath)
    currentStreamingRecording = null
    throw new Error('Recording too short (less than 5 seconds)')
  }

  const id = generateLogId(filepath)

  const log = appendLog({
    id,
    name: filename,
    path: filepath,
    timestamp: new Date().toISOString(),
    isAudioOnly,
  })

  // Notify library window about the new log
  if (libraryWindow) {
    libraryWindow.webContents.send('log-added', {
      id,
      name: filename,
      path: filepath,
      timestamp: log.timestamp,
    })
  }

  // Clean up the streaming recording
  currentStreamingRecording = null

  return filepath
}


export function isRecordingActive(): boolean {
  return currentStreamingRecording !== null
}

export async function cancelStreamingRecording(): Promise<void> {
  if (!currentStreamingRecording) {
    return
  }

  const filepath = currentStreamingRecording.filepath

  // Move the file to trash since recording was cancelled
  try {
    await moveToTrash(filepath)
  } catch (error) {
    console.error('Error moving cancelled recording to trash:', error)
  }

  // Clean up the streaming recording
  currentStreamingRecording = null
}
