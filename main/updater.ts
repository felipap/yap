import { autoUpdater } from 'electron-updater'
import { getMainWindow } from './windows'

export function setupAutoUpdater(): void {
  // Only check for updates in production
  if (process.env.NODE_ENV === 'development') {
    return
  }

  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify()

  // Check for updates every 4 hours
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify()
    },
    4 * 60 * 60 * 1000,
  )

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info.version)
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`
    logMessage = logMessage + ` - Downloaded ${progressObj.percent}%`
    logMessage =
      logMessage + ` (${progressObj.transferred}/${progressObj.total})`
    console.log(logMessage)

    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)

    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }
  })
}
