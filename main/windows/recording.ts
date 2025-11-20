import { BrowserWindow } from 'electron'
import { join } from 'path'

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export let recordingWindow: BrowserWindow | null = null

// The recording window is used to get a camera feed. It always exists and it's
// always hidden (except in development, where it's visible).
export function createRecordingWindow(): BrowserWindow {
  if (recordingWindow) {
    throw new Error('RecordingWindow already created')
  }

  const visible = IS_DEVELOPMENT

  const recordingWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 200,
    height: 200,
    maxWidth: 200,
    maxHeight: 200,
    minWidth: 200,
    minHeight: 200,
    show: visible,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../recording/preload.js'),
    },
  }

  recordingWindow = new BrowserWindow(recordingWindowOptions)

  // Load the recording window (static HTML file)
  if (process.env.NODE_ENV === 'development') {
    recordingWindow.loadURL('http://localhost:4002/index.html')
  } else {
    const recordingPath = join(
      __dirname,
      '../../windows',
      'camera',
      'index.html',
    )
    recordingWindow.loadFile(recordingPath)
  }

  // Clean up reference when window is closed
  recordingWindow.on('closed', () => {
    recordingWindow = null
  })

  return recordingWindow
}

export function getRecordingWindow(): BrowserWindow | null {
  return recordingWindow
}
