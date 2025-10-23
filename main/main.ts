import 'source-map-support/register'

import { app, BrowserWindow } from 'electron'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { setupAutoUpdater } from './updater'
import { createWindow } from './windows'
import { debug } from './lib/logger'
import * as recording from './recording/recording'
import { getTempDir, getRecordingsDir } from './lib/config'

// Crash recovery function
async function recoverIncompleteRecordings() {
  try {
    const { join } = await import('path')
    const { homedir } = await import('os')
    const { readdir, readFile, unlink, writeFile, mkdir } = await import(
      'fs/promises'
    )

    const tempDir = getTempDir()

    try {
      const files = await readdir(tempDir)
      const chunkFiles = files.filter((file) => file.includes('-chunk-'))

      if (chunkFiles.length === 0) {
        debug('No incomplete recordings found')
        return
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

      const recoveredCount = Object.keys(recordings).length
      debug(`Found ${recoveredCount} incomplete recordings to recover`)

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
          const filename = `recovered-${recordingId}-${timestamp}.webm`
          const recordingsDir = getRecordingsDir()
          await mkdir(recordingsDir, { recursive: true })
          const filepath = join(recordingsDir, filename)

          await writeFile(filepath, combinedBuffer)

          // Clean up chunk files
          for (const chunkPath of chunkPaths) {
            await unlink(chunkPath)
          }

          debug(`Recovered recording: ${filepath}`)
        } catch (error) {
          console.error(`Error recovering recording ${recordingId}:`, error)
        }
      }
    } catch (error) {
      // Temp directory doesn't exist yet, which is fine
      debug('No temp directory found for recovery')
    }
  } catch (error) {
    console.error('Error during crash recovery:', error)
  }
}

registerProtocols()

setupAutoUpdater()

app.whenReady().then(async () => {
  // Setup protocol handlers
  setupProtocolHandlers()

  // Attempt to recover any incomplete recordings from crashes
  await recording.recoverIncompleteRecordings()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught exceptions with better stack traces
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  console.error('Stack trace:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
