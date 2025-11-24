import { BrowserWindow, app, dialog } from 'electron'
import { join } from 'path'
import { cancelStreamingRecording, isRecordingActive } from '../recording'
import { store } from '../store'
import { findIconPath } from './utils'

export let libraryWindow: BrowserWindow

export function createLibraryWindow(): BrowserWindow {
  // If window already exists, return it (window should never be destroyed)
  if (libraryWindow) {
    return libraryWindow
  }

  const windowBounds = store.get('windowBounds', { width: 800, height: 500 })

  // Check if window was last focused (only relevant in development)
  const wasLastFocused = store.get('wasLastFocused', false)
  const shouldShow = true // process.env.NODE_ENV !== 'development' || wasLastFocused

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 800,
    minHeight: 500,
    center: true,
    maxWidth: 800,
    maxHeight: 1000,
    // Only show window in development if it was last focused
    show: shouldShow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload.js'),
      // backgroundThrottling: false,
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
  }

  // Try multiple possible icon paths for both dev and production
  const iconPath = findIconPath()
  if (iconPath) {
    windowOptions.icon = iconPath
  }

  libraryWindow = new BrowserWindow(windowOptions)
  console.log('did set library window')

  if (iconPath) {
    app.dock?.setIcon(iconPath)
    libraryWindow.setIcon(iconPath)
  }

  // Hide instead of destroy - prevent window from ever being destroyed
  libraryWindow.on('close', async (event) => {
    console.log('close called')

    // Save window bounds before hiding
    const bounds = libraryWindow!.getBounds()
    store.set('windowBounds', bounds)

    console.log('currentStreamingRecording', isRecordingActive())

    if (!app.isQuitting) {
      // Check if recording is active
      if (isRecordingActive()) {
        // Prevent closing
        event.preventDefault()

        // Show confirmation dialog
        const response = await dialog.showMessageBox(libraryWindow, {
          type: 'warning',
          buttons: ['Cancel', 'Close Anyway'],
          defaultId: 0,
          cancelId: 0,
          title: 'Recording in Progress',
          message: 'A recording is currently in progress.',
          detail:
            'Closing the window will stop the recording. Are you sure you want to close?',
        })

        // If user clicked "Close Anyway", stop recording and proceed with closing
        if (response.response === 1) {
          // Send message to frontend to stop recording
          libraryWindow!.webContents.send('stop-recording-requested')
          // Cancel the recording on the backend
          await cancelStreamingRecording()
          libraryWindow!.hide()
        }
      } else {
        // Don't let closing the window destroy the window
        event.preventDefault()
        libraryWindow!.hide()
      }
    }
  })

  // Track window focus state
  libraryWindow.on('focus', () => {
    store.set('wasLastFocused', true)
  })

  libraryWindow.on('blur', () => {
    store.set('wasLastFocused', false)
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    libraryWindow.loadURL('http://localhost:4000/main.html')
    // window.webContents.openDevTools()
  } else {
    // In production, load from the app.asar bundle
    const rendererPath = join(
      __dirname,
      '../../windows',
      'library',
      'index.html',
    )
    console.log('__dirname:', __dirname)
    console.log('Renderer path:', rendererPath)
    libraryWindow.loadFile(rendererPath)
  }

  // Show window after content is loaded in development to prevent focus
  // stealing.
  if (process.env.NODE_ENV === 'development' && wasLastFocused) {
    // libraryWindow.once('ready-to-show', () => {
    //   libraryWindow!.show()
    // })
  }

  return libraryWindow
}

export function getLibraryWindow(): BrowserWindow | undefined {
  return libraryWindow ?? undefined
}
