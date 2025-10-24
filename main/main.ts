import 'source-map-support/register'

import { app, BrowserWindow } from 'electron'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { setupIpcHandlers } from './ipc'
import { getRecordingsDir, getTempDir } from './lib/config'
import { debug } from './lib/logger'
import { setupBackgroundRecordingIPC } from './recording/background-recording'
import * as recording from './recording/recording'
import { createTray, destroyTray } from './tray'
import { setupAutoUpdater } from './updater'
import {
  createMainWindow,
  createRecordingWindow,
  createSettingsWindow,
  getMainWindow,
  getRecordingWindow,
  getSettingsWindow,
} from './windows'

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

// Prevent multiple initialization
let isInitialized = false

app.whenReady().then(async () => {
  if (isInitialized) {
    console.log('App already initialized, skipping...')
    return
  }
  isInitialized = true
  // Setup protocol handlers
  setupProtocolHandlers()

  // Setup background recording IPC handlers
  setupBackgroundRecordingIPC()

  // Attempt to recover any incomplete recordings from crashes
  await recording.recoverIncompleteRecordings()

  // Create tray (this will be available even when no windows are open)
  createTray()

  // Create main window
  const mainWindow = createMainWindow()
  createSettingsWindow()
  createRecordingWindow()

  // Initialize recording system
  recording.initializeRecording(mainWindow)

  setupIpcHandlers(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // The tray will remain available for background recording
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
