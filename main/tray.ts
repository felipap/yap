import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'
import { startRecording, stopRecording } from './recording'
import {
  getBackgroundRecordingState,
  startBackgroundRecording,
  stopBackgroundRecording,
} from './recording/background-recording'
import { RecordingConfig } from './recording/types'
import { createLibraryWindow } from './windows'

let tray: Tray | null = null
let isRecording = false

// Create a red circle icon for recording state
function createRecordIcon(): Electron.NativeImage {
  // Create a simple red circle using a data URL
  const size = 16
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#ff0000"/>
    </svg>
  `
  const buffer = Buffer.from(svg)
  return nativeImage.createFromBuffer(buffer)
}

// Create a normal app icon for non-recording state
function createNormalIcon(): Electron.NativeImage {
  // Try to use the app icon, fallback to a simple icon
  const iconPath = findIconPath()
  if (iconPath) {
    return nativeImage.createFromPath(iconPath)
  }

  // Fallback: create a simple icon
  const size = 16
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#333333"/>
    </svg>
  `
  const buffer = Buffer.from(svg)
  return nativeImage.createFromBuffer(buffer)
}

function findIconPath(): string | null {
  const { existsSync } = require('fs')
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

export function createTray(): Tray {
  if (tray) {
    return tray
  }

  // Create tray with normal icon initially
  const iconPath = findIconPath()
  const icon = iconPath
    ? nativeImage.createFromPath(iconPath)
    : createNormalIcon()

  tray = new Tray(icon)

  // Set tooltip
  tray.setToolTip('Yap Camera')

  // Create context menu
  updateTrayMenu()

  // Handle tray click
  tray.on('click', () => {
    const mainWindow = BrowserWindow.getAllWindows().find(
      (w) => w === require('./windows').mainWindow,
    )
    if (!mainWindow || mainWindow.isDestroyed()) {
      createLibraryWindow()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

function updateTrayMenu(): void {
  if (!tray) return

  const menu = Menu.buildFromTemplate([
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      click: async () => {
        if (isRecording) {
          await handleStopRecording()
        } else {
          await handleStartRecording()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        const mainWindow = BrowserWindow.getAllWindows().find(
          (w) => w === require('./windows').mainWindow,
        )
        if (!mainWindow || mainWindow.isDestroyed()) {
          createLibraryWindow()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)
}

async function handleStartRecording(): Promise<void> {
  try {
    const config: RecordingConfig = {
      mode: 'screen',
      cameraId: '',
      microphoneId: '',
    }

    // Use background recording when main window is not visible
    const mainWindow = BrowserWindow.getAllWindows().find(
      (w) => w === require('./windows').mainWindow,
    )
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
      await startBackgroundRecording(config)
    } else {
      await startRecording(config)
    }

    isRecording = true
    updateTrayIcon()
    updateTrayMenu()
  } catch (error) {
    console.error('Failed to start recording:', error)
  }
}

async function handleStopRecording(): Promise<void> {
  try {
    // Check if we're using background recording
    const backgroundState = getBackgroundRecordingState()
    if (backgroundState.isRecording) {
      await stopBackgroundRecording()
    } else {
      await stopRecording()
    }

    isRecording = false
    updateTrayIcon()
    updateTrayMenu()
  } catch (error) {
    console.error('Failed to stop recording:', error)
  }
}

function updateTrayIcon(): void {
  if (!tray) return

  if (isRecording) {
    tray.setImage(createRecordIcon())
    tray.setToolTip('Yap Camera - Recording')
  } else {
    const iconPath = findIconPath()
    const icon = iconPath
      ? nativeImage.createFromPath(iconPath)
      : createNormalIcon()
    tray.setImage(icon)
    tray.setToolTip('Yap Camera')
  }
}

export function updateRecordingState(recording: boolean): void {
  isRecording = recording
  updateTrayIcon()
  updateTrayMenu()
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
