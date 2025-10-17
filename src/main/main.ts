import 'source-map-support/register'
import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { autoUpdater } from 'electron-updater'
import { store } from './store'
import { setupIpcHandlers } from './ipc'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { ensureCacheDir } from './lib/thumbnails'
import assert from 'assert'

// Register the custom protocols
registerProtocols()

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify()

let mainWindow: BrowserWindow

function createWindow() {
  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
  }

  // Try multiple possible icon paths for both dev and production
  const possibleIconPaths = [
    join(__dirname, '../assets', 'icon.png'),
    join(__dirname, '../assets', 'icon.icns'),
    join(process.resourcesPath, 'assets', 'icon.png'),
    join(process.resourcesPath, 'assets', 'icon.icns'),
    join(process.cwd(), 'assets', 'icon.png'),
    join(process.cwd(), 'assets', 'icon.icns'),
  ]

  let iconPath = null
  for (const path of possibleIconPaths) {
    if (existsSync(path)) {
      iconPath = path
      break
    }
  }

  if (iconPath) {
    windowOptions.icon = iconPath
  }

  mainWindow = new BrowserWindow(windowOptions)

  if (iconPath) {
    app.dock?.setIcon(iconPath)
    mainWindow.setIcon(iconPath)
  }

  // Save window bounds on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', bounds)
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    // mainWindow.webContents.openDevTools()
  } else {
    // In production, load from the app.asar bundle
    // The renderer files are at /dist/renderer/index.html in the asar
    const rendererPath = join(__dirname, '..', 'dist', 'renderer', 'index.html')
    console.log('__dirname:', __dirname)
    console.log('Renderer path:', rendererPath)
    mainWindow.loadFile(rendererPath)
  }

  // Setup IPC handlers after window is created
  setupIpcHandlers(mainWindow)

  // Setup auto-updater event handlers
  setupAutoUpdater()
}

function setupAutoUpdater() {
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

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)

    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }
  })
}

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
