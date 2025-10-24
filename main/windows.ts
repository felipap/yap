import { BrowserWindow, app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { store } from './store'

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export let libraryWindow: BrowserWindow
export let settingsWindow: BrowserWindow | null = null
export let recordingWindow: BrowserWindow | null = null

export function createLibraryWindow(): BrowserWindow {
  if (libraryWindow) {
    console.log('Library window already created, skipping...')
    throw new Error('Library window already created')
  }

  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

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

  libraryWindow = new BrowserWindow(windowOptions)

  if (iconPath) {
    app.dock?.setIcon(iconPath)
    libraryWindow.setIcon(iconPath)
  }

  // Save window bounds on close and hide instead of destroy
  libraryWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      const bounds = libraryWindow.getBounds()
      store.set('windowBounds', bounds)
      libraryWindow.hide()
      return false
    }
    return true
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
      '..',
      'windows',
      'library',
      'index.html',
    )
    console.log('__dirname:', __dirname)
    console.log('Renderer path:', rendererPath)
    libraryWindow.loadFile(rendererPath)
  }

  // Show window after content is loaded in development to prevent focus stealing
  if (process.env.NODE_ENV === 'development' && wasLastFocused) {
    libraryWindow.once('ready-to-show', () => {
      libraryWindow.show()
    })
  }

  // // Load recording handler script
  // mainWindow.webContents.once('dom-ready', () => {
  //   mainWindow.webContents.executeJavaScript(`
  //     // Load the recording handler script
  //     const script = document.createElement('script');
  //     script.src = './recording-handler.js';
  //     document.head.appendChild(script);
  //   `)
  // })

  return libraryWindow
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
  return libraryWindow
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
    titleBarStyle: 'default',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    // parent: libraryWindow,
    // modal: false,
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
      preload: join(__dirname, 'recording', 'preload.js'),
    },
  }

  recordingWindow = new BrowserWindow(recordingWindowOptions)

  // Load the recording window (static HTML file)
  if (process.env.NODE_ENV === 'development') {
    recordingWindow.loadURL('http://localhost:4002/index.html')
  } else {
    const recordingPath = join(
      __dirname,
      '..',
      'windows',
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
