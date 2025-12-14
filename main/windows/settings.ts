import { BrowserWindow } from 'electron'
import { join } from 'path'
import { findIconPath } from './utils'

export let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow) {
    throw new Error('SettingsWindow already created')
  }

  const settingsWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 500,
    height: 600,
    minWidth: 500,
    minHeight: 600,
    maxWidth: 500,
    maxHeight: 600,
    center: true,
    resizable: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload.js'),
    },
    titleBarStyle: 'default',
    vibrancy: 'fullscreen-ui',
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
      '../../windows',
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
