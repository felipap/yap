import 'source-map-support/register'

import { app, BrowserWindow } from 'electron'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { ensureCacheDir } from './lib/thumbnails'
import { setupAutoUpdater } from './updater'
import { createWindow } from './windows'

registerProtocols()

setupAutoUpdater()

app.whenReady().then(async () => {
  // Initialize cache directory
  await ensureCacheDir()

  // Setup protocol handlers
  setupProtocolHandlers()

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
