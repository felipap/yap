import 'source-map-support/register'

import { app, BrowserWindow } from 'electron'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { setupIpcHandlers } from './ipc'
import { setupBackgroundRecordingIPC } from './recording/background-recording'
import { createTray } from './tray'
import { setupAutoUpdater } from './updater'
import {
  createMainWindow,
  createRecordingWindow,
  createSettingsWindow,
  getMainWindow,
} from './windows'
import { recoverIncompleteRecordings } from './recording'

registerProtocols()

setupAutoUpdater()

// Prevent multiple initialization
let isInitialized = false

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

app.whenReady().then(async () => {
  if (isInitialized) {
    console.log('App already initialized, skipping...')
    return
  }
  isInitialized = true

  setupProtocolHandlers()

  setupBackgroundRecordingIPC()

  await recoverIncompleteRecordings()

  setupIpcHandlers()

  // Create main window
  const mainWindow = createMainWindow()
  createSettingsWindow()
  createRecordingWindow()
  createTray()

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
