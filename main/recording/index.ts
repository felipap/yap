import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { FILE_PATTERNS, getRecordingsDir, getTempDir } from '../lib/config'
import { debug } from '../lib/logger'
import { libraryWindow } from '../windows'
import { RecordingConfig, RecordingState } from './types'

// Global recording state - only one recording at a time
let recordingState: RecordingState = {
  isRecording: false,
  recordingId: null,
  startTime: null,
  duration: 0,
}

export async function startRecording(config: RecordingConfig): Promise<string> {
  return 'fuck'

  if (recordingState.isRecording) {
    throw new Error('Recording is already in progress')
  }

  try {
    // Generate unique recording ID
    const recordingId = `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Update state
    recordingState = {
      isRecording: true,
      recordingId,
      startTime: Date.now(),
      duration: 0,
    }

    // Send start recording command to renderer
    if (libraryWindow) {
      libraryWindow.webContents.send('start-recording', {
        recordingId,
        config: {
          mode: config.mode,
          cameraId: config.cameraId,
          microphoneId: config.microphoneId,
        },
      })
    }

    // Notify frontend
    notifyRecordingStateChange()

    debug(`Recording started: ${recordingId}`)
    return recordingId
  } catch (error) {
    recordingState.isRecording = false
    throw error
  }
}

export async function stopRecording(): Promise<string> {
  if (!recordingState.isRecording) {
    throw new Error('No recording in progress')
  }

  try {
    // Send stop recording command to renderer
    if (libraryWindow) {
      libraryWindow.webContents.send('stop-recording', {
        recordingId: recordingState.recordingId,
      })
    }

    // Update state
    recordingState = {
      isRecording: false,
      recordingId: null,
      startTime: null,
      duration: 0,
    }

    // Notify frontend
    notifyRecordingStateChange()

    // For now, return a placeholder filename - the actual saving will be handled by the renderer
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = FILE_PATTERNS.RECORDING_FILE(timestamp)

    debug(`Recording stopped: ${filename}`)
    return filename
  } catch (error) {
    recordingState.isRecording = false
    throw error
  }
}

export async function emergencySave(): Promise<void> {
  if (recordingState.isRecording && recordingState.recordingId) {
    try {
      debug(`Emergency saving recording: ${recordingState.recordingId}`)

      // Send emergency save command to renderer
      if (libraryWindow) {
        libraryWindow.webContents.send('emergency-save-recording', {
          recordingId: recordingState.recordingId,
        })
      }

      debug(
        `Emergency save triggered for recording: ${recordingState.recordingId}`,
      )
    } catch (error) {
      console.error('Error emergency saving recording:', error)
    }
  }
}

export function getRecordingState(): RecordingState {
  return { ...recordingState }
}

export async function recoverIncompleteRecordings(): Promise<string[]> {
  try {
    const tempDir = getTempDir()

    try {
      const files = await readdir(tempDir)
      const chunkFiles = files.filter((file) => file.includes('-chunk-'))

      if (chunkFiles.length === 0) {
        debug('No incomplete recordings found')
        return []
      }

      // Group chunks by recording ID
      const recordings: Record<string, string[]> = {}
      for (const file of chunkFiles) {
        const recordingId = file.split('-chunk-')[0]
        if (!recordings[recordingId]) {
          recordings[recordingId] = []
        }
        recordings[recordingId].push(join(tempDir, file))
      }

      const recoveredRecordings: string[] = []

      for (const [recordingId, chunkPaths] of Object.entries(recordings)) {
        try {
          // Sort chunks by timestamp
          chunkPaths.sort()

          // Combine all chunks into one file
          const combinedBuffer = Buffer.concat(
            await Promise.all(
              chunkPaths.map(async (path) => {
                const chunkBuffer = await readFile(path)
                return chunkBuffer
              }),
            ),
          )

          // Save as recovered recording
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = FILE_PATTERNS.RECOVERED_FILE(recordingId, timestamp)
          const recordingsDir = getRecordingsDir()
          await mkdir(recordingsDir, { recursive: true })
          const filepath = join(recordingsDir, filename)

          await writeFile(filepath, combinedBuffer)

          // Clean up chunk files
          for (const chunkPath of chunkPaths) {
            await unlink(chunkPath)
          }

          recoveredRecordings.push(filepath)
          debug(`Recovered recording: ${filepath}`)
        } catch (error) {
          console.error(`Error recovering recording ${recordingId}:`, error)
        }
      }

      return recoveredRecordings
    } catch (error) {
      // Temp directory doesn't exist yet, which is fine
      debug('No temp directory found for recovery')
      return []
    }
  } catch (error) {
    console.error('Error during crash recovery:', error)
    return []
  }
}

// Cleanup method for app shutdown
export async function cleanup(): Promise<void> {
  console.log('cleanup')

  if (recordingState.isRecording) {
    try {
      await emergencySave()
    } catch (error) {
      console.error('Error during emergency save on cleanup:', error)
    }
  }
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

// Crash recovery function
// async function recoverIncompleteRecordings() {
//   try {
//     const { join } = await import('path')
//     const { homedir } = await import('os')
//     const { readdir, readFile, unlink, writeFile, mkdir } = await import(
//       'fs/promises'
//     )

//     const tempDir = getTempDir()

//     try {
//       const files = await readdir(tempDir)
//       const chunkFiles = files.filter((file) => file.includes('-chunk-'))

//       if (chunkFiles.length === 0) {
//         debug('No incomplete recordings found')
//         return
//       }

//       // Group chunks by recording ID
//       const recordings: Record<string, string[]> = {}
//       for (const file of chunkFiles) {
//         const recordingId = file.split('-chunk-')[0]
//         if (!recordings[recordingId]) {
//           recordings[recordingId] = []
//         }
//         recordings[recordingId].push(join(tempDir, file))
//       }

//       const recoveredCount = Object.keys(recordings).length
//       debug(`Found ${recoveredCount} incomplete recordings to recover`)

//       for (const [recordingId, chunkPaths] of Object.entries(recordings)) {
//         try {
//           // Sort chunks by timestamp
//           chunkPaths.sort()

//           // Combine all chunks into one file
//           const combinedBuffer = Buffer.concat(
//             await Promise.all(
//               chunkPaths.map(async (path) => {
//                 const chunkBuffer = await readFile(path)
//                 return chunkBuffer
//               }),
//             ),
//           )

//           // Save as recovered recording
//           const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
//           const filename = `recovered-${recordingId}-${timestamp}.webm`
//           const recordingsDir = getRecordingsDir()
//           await mkdir(recordingsDir, { recursive: true })
//           const filepath = join(recordingsDir, filename)

//           await writeFile(filepath, combinedBuffer)

//           // Clean up chunk files
//           for (const chunkPath of chunkPaths) {
//             await unlink(chunkPath)
//           }

//           debug(`Recovered recording: ${filepath}`)
//         } catch (error) {
//           console.error(`Error recovering recording ${recordingId}:`, error)
//         }
//       }
//     } catch (error) {
//       // Temp directory doesn't exist yet, which is fine
//       debug('No temp directory found for recovery')
//     }
//   } catch (error) {
//     console.error('Error during crash recovery:', error)
//   }
// }
