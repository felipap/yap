import 'source-map-support/register'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { store } from './store'
import { setupIpcHandlers } from './ipc'
import { registerProtocols, setupProtocolHandlers } from './handle-protocols'
import { ensureCacheDir } from './lib/thumbnails'

// Register the custom protocols
registerProtocols()

let mainWindow: BrowserWindow

function createWindow() {
  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
  })

  // Save window bounds on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', bounds)
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
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
