import { BrowserWindow, app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { store } from './store'

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export let mainWindow: BrowserWindow
export let settingsWindow: BrowserWindow | null = null
export let recordingWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  if (mainWindow) {
    throw new Error('MainWindow already created')
  }

  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

  // Check if window was last focused (only relevant in development)
  const wasLastFocused = store.get('wasLastFocused', false)
  const shouldShow = process.env.NODE_ENV !== 'development' || wasLastFocused

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 900,
    minHeight: 500,
    center: true,
    maxWidth: 900,
    // Only show window in development if it was last focused
    show: shouldShow,
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
  const iconPath = findIconPath()
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

  // Track window focus state
  mainWindow.on('focus', () => {
    store.set('wasLastFocused', true)
  })

  mainWindow.on('blur', () => {
    store.set('wasLastFocused', false)
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4000/main.html')
    // window.webContents.openDevTools()
  } else {
    // In production, load from the app.asar bundle
    const rendererPath = join(__dirname, '..', 'windows', 'main', 'index.html')
    console.log('__dirname:', __dirname)
    console.log('Renderer path:', rendererPath)
    mainWindow.loadFile(rendererPath)
  }

  // Show window after content is loaded in development to prevent focus stealing
  if (process.env.NODE_ENV === 'development' && wasLastFocused) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    })
  }

  // Load recording handler script
  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      // Load the recording handler script
      const script = document.createElement('script');
      script.src = './recording-handler.js';
      document.head.appendChild(script);
    `)
  })

  return mainWindow
}

export function getIconPath(env?: 'production' | 'development'): string | null {
  const currentEnv =
    env ||
    (process.env.NODE_ENV as 'production' | 'development') ||
    'development'

  const possibleIconPaths = [
    join(__dirname, '../assets', 'icon.png'),
    join(__dirname, '../assets', 'icon.icns'),
    join(process.resourcesPath, 'assets', 'icon.png'),
    join(process.resourcesPath, 'assets', 'icon.icns'),
    join(process.cwd(), 'assets', 'icon.png'),
    join(process.cwd(), 'assets', 'icon.icns'),
  ]

  for (const path of possibleIconPaths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}

function findIconPath(): string | null {
  return getIconPath()
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindow
}

//
//
//
//

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow) {
    throw new Error('SettingsWindow already created')
  }

  const settingsWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 500,
    height: 400,
    minWidth: 400,
    minHeight: 300,
    center: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    parent: mainWindow,
    modal: false,
  }

  // Try multiple possible icon paths for both dev and production
  const iconPath = findIconPath()
  if (iconPath) {
    settingsWindowOptions.icon = iconPath
  }

  settingsWindow = new BrowserWindow(settingsWindowOptions)

  // Load the settings page
  if (process.env.NODE_ENV === 'development') {
    settingsWindow.loadURL('http://localhost:4001/index.html')
  } else {
    // In production, load from the app.asar bundle
    const settingsPath = join(
      __dirname,
      '..',
      'windows',
      'settings',
      'index.html',
    )
    settingsWindow.loadFile(settingsPath)
  }

  // Clean up reference when window is closed
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

//
//
//

export function createRecordingWindow(): BrowserWindow {
  // Don't create multiple recording windows
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
      preload: join(__dirname, 'recording', 'preload.js'),
    },
  }

  recordingWindow = new BrowserWindow(recordingWindowOptions)

  // Load the recording window (static HTML file)
  const recordingPath = join(
    __dirname,
    '..',
    'windows',
    'recording',
    'index.html',
  )
  recordingWindow.loadFile(recordingPath)

  // Clean up reference when window is closed
  recordingWindow.on('closed', () => {
    recordingWindow = null
  })

  return recordingWindow
}

export function getRecordingWindow(): BrowserWindow | null {
  return recordingWindow
}
