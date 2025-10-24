import 'source-map-support/register'

import { IPCMode, init as SentryInit } from '@sentry/electron/main'
import started from 'electron-squirrel-startup'
import { app, BrowserWindow } from 'electron'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { setupIpcHandlers } from './ipc'
import { createTray } from './tray'
import { setupAutoUpdater } from './updater'
import {
  createLibraryWindow,
  createRecordingWindow,
  createSettingsWindow,
  getMainWindow,
  libraryWindow,
} from './windows'

if (app.isPackaged) {
  SentryInit({
    dsn: 'https://df66516e528e1e116926f9631fca55f3@o175888.ingest.us.sentry.io/4509567206555648',
    release: app.getVersion(),
    ipcMode: IPCMode.Classic,
  })
}

app.setAboutPanelOptions({
  applicationName: `Yap ${app.isPackaged ? '' : '(dev)'}`,
  copyright: 'Copyright © 2025 Yap Camera',
  version: app.getVersion(),
  // authors: ['Felipe Aragão <faragaop@gmail.com>'],
  credits: 'Felipe Aragão @feliparagao',
  website: 'https://github.com/faragao/yap',
  // iconPath: getImagePath('original.png'),
})

registerProtocols()

setupAutoUpdater()

// Prevent multiple initialization
let isInitialized = false

async function onInit() {
  if (isInitialized) {
    console.log('App already initialized, skipping...')
    return
  }
  isInitialized = true

  setupProtocolHandlers()

  setupIpcHandlers()

  // Create windows
  createLibraryWindow()
  createSettingsWindow()
  // createRecordingWindow()
  createTray()

  app.on('activate', () => {
    // On macOS, when the dock icon is clicked, show the library window
    if (libraryWindow.isMinimized()) {
      libraryWindow.restore()
    }
    libraryWindow.show()
    libraryWindow.focus()
  })
}

async function quitApp() {
  console.log('Will quit.')
  // onAppClose()
  app.isQuitting = true
  app.quit()
  process.exit(0)
}

//
//
//
//
//
//

// Declare `isQuitting`
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean
    }
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// app.setAppUserModelId(app.getName())

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('Did not get lock. Quitting.')
  quitApp()
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, focus our window instead
    if (libraryWindow) {
      if (libraryWindow.isMinimized()) {
        libraryWindow.restore()
      }
      libraryWindow.focus()
    }
  })
}

app.whenReady().then(onInit)

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // The tray will remain available for background recording
  // Note: Main window is now hidden instead of destroyed when closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Before app quits
app.on('before-quit', () => {
  app.isQuitting = true
})
