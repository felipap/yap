import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { store } from './store'
import { setupIpcHandlers } from './ipc'

let mainWindow: BrowserWindow
let settingsWindow: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  const windowBounds = store.get('windowBounds', { width: 1200, height: 800 })

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 900,
    minHeight: 500,
    center: true,
    maxWidth: 900,
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

  // Load the app
  loadApp(mainWindow)

  // Setup IPC handlers after window is created
  setupIpcHandlers(mainWindow)

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

function loadApp(window: BrowserWindow): void {
  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:3000')
    // window.webContents.openDevTools()
  } else {
    // In production, load from the app.asar bundle
    // The renderer files are at /dist/renderer/index.html in the asar
    const rendererPath = join(__dirname, '..', 'dist', 'renderer', 'index.html')
    console.log('__dirname:', __dirname)
    console.log('Renderer path:', rendererPath)
    window.loadFile(rendererPath)
  }
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindow
}

export function createSettingsWindow(): BrowserWindow {
  // Don't create multiple settings windows
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
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

  if (iconPath) {
    settingsWindow.setIcon(iconPath)
  }

  // Load the settings page
  loadSettingsApp(settingsWindow)

  // Clean up reference when window is closed
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

function loadSettingsApp(window: BrowserWindow): void {
  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:3001')
  } else {
    // In production, load from the app.asar bundle
    const settingsPath = join(
      __dirname,
      '..',
      'dist',
      'renderer-settings',
      'index.html',
    )
    window.loadFile(settingsPath)
  }
}
