import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { store } from '../store'
import { findIconPath } from './utils'

export let libraryWindow: BrowserWindow

export function createLibraryWindow(): BrowserWindow {
  if (libraryWindow) {
    console.log('Library window already created, skipping...')
    throw new Error('Library window already created')
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
      backgroundThrottling: false,
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

  if (iconPath) {
    app.dock?.setIcon(iconPath)
    libraryWindow.setIcon(iconPath)
  }

  // Save window bounds on close / destroy
  libraryWindow.on('close', () => {
    const bounds = libraryWindow.getBounds()
    store.set('windowBounds', bounds)
  })

  // Hide instead of destroy
  libraryWindow.on('close', (event) => {
    if (!app.isQuitting) {
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
      '../../windows',
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

  return libraryWindow
}

export function getMainWindow(): BrowserWindow | undefined {
  return libraryWindow
}
