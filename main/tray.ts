import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import path from 'path'
import { startRecording, stopRecording } from './recording'
import {
  getBackgroundRecordingState,
  startBackgroundRecording,
  stopBackgroundRecording,
} from './recording/background-recording'
import { RecordingConfig } from './recording/types'
import { libraryWindow } from './windows'

let tray: Tray | null = null
let isRecording = false

export function createTray(): Tray {
  if (tray) {
    return tray
  }

  const iconPath = getImagePath('tray-default.png')
  console.log('iconPath', iconPath)
  const icon = nativeImage.createFromPath(iconPath)
  // if you want to resize it, be careful, it creates a copy
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  // here is the important part (has to be set on the resized version)
  trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)

  tray.setToolTip('Yap Camera')

  // Create context menu
  updateTrayMenu()

  tray.on('click', () => {
    libraryWindow.show()
    libraryWindow.focus()
  })

  return tray
}

function updateTrayMenu(): void {
  if (!tray) {
    return
  }

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
        libraryWindow.show()
        libraryWindow.focus()
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
    const iconPath = getImagePath('tray-recording.png')
    const icon = nativeImage.createFromPath(iconPath)
    tray.setImage(icon)
    tray.setToolTip('Yap Camera - Recording')
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

export function getImagePath(name: string) {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  return path.join(base, name)
}
