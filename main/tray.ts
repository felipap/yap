import { app, Menu, nativeImage, Tray } from 'electron'
import path from 'path'
import { debug } from './lib/logger'
import { libraryWindow } from './windows'

let tray: Tray | null = null
let isRecording = false

export function createTray(): Tray {
  if (tray) {
    return tray
  }

  const iconPath = getImagePath('tray-default.png')
  debug('iconPath', iconPath)
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
      click: async () => {},
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

