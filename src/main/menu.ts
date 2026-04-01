import { app, BrowserWindow, Menu } from 'electron'
import { getLibraryWindow } from './windows/library'
import { exportTranscripts } from './export-transcripts'
import { store } from './store'

interface CameraMenuDevice {
  id: string
  label: string
}

interface CameraMenuState {
  cameras: CameraMenuDevice[]
  selectedCameraId: string
  automaticCameraSelection: boolean
  enableScreenFlash: boolean
}

interface MicrophoneMenuState {
  microphones: CameraMenuDevice[]
  selectedMicrophoneId: string
  automaticMicrophoneSelection: boolean
}

const cameraMenuState: CameraMenuState = {
  cameras: [],
  selectedCameraId: '',
  automaticCameraSelection: true,
  enableScreenFlash: true,
}

const microphoneMenuState: MicrophoneMenuState = {
  microphones: [],
  selectedMicrophoneId: '',
  automaticMicrophoneSelection: true,
}

function notifyLibraryWindow(channel: string, payload: unknown) {
  const window = getLibraryWindow()
  if (!window || window.isDestroyed()) {
    return
  }

  window.webContents.send(channel, payload)
}

export function updateCameraMenuState(partial: Partial<CameraMenuState>) {
  cameraMenuState.cameras = partial.cameras ?? cameraMenuState.cameras
  cameraMenuState.selectedCameraId =
    partial.selectedCameraId ?? cameraMenuState.selectedCameraId
  cameraMenuState.automaticCameraSelection =
    partial.automaticCameraSelection ?? cameraMenuState.automaticCameraSelection
  cameraMenuState.enableScreenFlash =
    partial.enableScreenFlash ?? cameraMenuState.enableScreenFlash

  setupMenu()
}

export function updateMicrophoneMenuState(
  partial: Partial<MicrophoneMenuState>,
) {
  microphoneMenuState.microphones =
    partial.microphones ?? microphoneMenuState.microphones
  microphoneMenuState.selectedMicrophoneId =
    partial.selectedMicrophoneId ?? microphoneMenuState.selectedMicrophoneId
  microphoneMenuState.automaticMicrophoneSelection =
    partial.automaticMicrophoneSelection ??
    microphoneMenuState.automaticMicrophoneSelection

  setupMenu()
}

export function setupMenu() {
  cameraMenuState.automaticCameraSelection = store.get(
    'cameraAutoSelect',
    cameraMenuState.automaticCameraSelection,
  )
  cameraMenuState.enableScreenFlash = store.get(
    'enableScreenFlash',
    cameraMenuState.enableScreenFlash,
  )
  microphoneMenuState.automaticMicrophoneSelection = store.get(
    'microphoneAutoSelect',
    microphoneMenuState.automaticMicrophoneSelection,
  )

  const cameraDeviceItems: Electron.MenuItemConstructorOptions[] =
    cameraMenuState.cameras.length > 0
      ? cameraMenuState.cameras.map((camera) => ({
          label: camera.label,
          type: 'radio',
          checked: camera.id === cameraMenuState.selectedCameraId,
          click: () => {
            cameraMenuState.selectedCameraId = camera.id
            store.set('selectedCameraId', camera.id)
            setupMenu()
            notifyLibraryWindow('camera-menu-selected', camera.id)
          },
        }))
      : [
          {
            label: 'No cameras found',
            enabled: false,
          },
        ]
  const microphoneDeviceItems: Electron.MenuItemConstructorOptions[] =
    microphoneMenuState.microphones.length > 0
      ? microphoneMenuState.microphones.map((microphone) => ({
          label: microphone.label,
          type: 'radio',
          checked:
            microphone.id === microphoneMenuState.selectedMicrophoneId,
          click: () => {
            microphoneMenuState.selectedMicrophoneId = microphone.id
            store.set('selectedMicrophoneId', microphone.id)
            setupMenu()
            notifyLibraryWindow('microphone-menu-selected', microphone.id)
          },
        }))
      : [
          {
            label: 'No microphones found',
            enabled: false,
          },
        ]

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Transcripts...',
          accelerator: 'CommandOrControl+E',
          click: async () => {
            const window = getLibraryWindow()
            if (window && !window.isDestroyed()) {
              await exportTranscripts(window)
            }
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
      ],
    },
    {
      label: 'View',
      submenu: [
        // { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        // { type: 'separator' },
        // { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Debug Mode',
          type: 'checkbox',
          checked: store.get('debugMode') || false,
          click: (menuItem) => {
            store.set('debugMode', menuItem.checked)
            BrowserWindow.getAllWindows().forEach((win) => {
              if (!win.isDestroyed()) {
                win.webContents.send('debug-mode-changed', menuItem.checked)
              }
            })
          },
        },
      ],
    },
    {
      label: 'Camera',
      submenu: [
        ...cameraDeviceItems,
        { type: 'separator' },
        {
          label: 'Automatic Camera Selection',
          type: 'checkbox',
          checked: cameraMenuState.automaticCameraSelection,
          click: (menuItem) => {
            cameraMenuState.automaticCameraSelection = menuItem.checked
            store.set('cameraAutoSelect', menuItem.checked)
            setupMenu()
            notifyLibraryWindow(
              'camera-menu-auto-selection-changed',
              menuItem.checked,
            )
          },
        },
        { type: 'separator' },
        {
          label: 'Enable Screen Flash',
          type: 'checkbox',
          checked: cameraMenuState.enableScreenFlash,
          click: (menuItem) => {
            cameraMenuState.enableScreenFlash = menuItem.checked
            store.set('enableScreenFlash', menuItem.checked)
            setupMenu()
            notifyLibraryWindow('camera-menu-screen-flash-changed', {
              enabled: menuItem.checked,
            })
          },
        },
      ],
    },
    {
      label: 'Microphone',
      submenu: [
        ...microphoneDeviceItems,
        { type: 'separator' },
        {
          label: 'Automatic Microphone Selection',
          type: 'checkbox',
          checked: microphoneMenuState.automaticMicrophoneSelection,
          click: (menuItem) => {
            microphoneMenuState.automaticMicrophoneSelection = menuItem.checked
            store.set('microphoneAutoSelect', menuItem.checked)
            setupMenu()
            notifyLibraryWindow(
              'microphone-menu-auto-selection-changed',
              menuItem.checked,
            )
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        {
          label: 'Float on Top',
          type: 'checkbox',
          checked: getLibraryWindow()?.isAlwaysOnTop() ?? false,
          click: (menuItem) => {
            const window = getLibraryWindow()
            if (window && !window.isDestroyed()) {
              window.setAlwaysOnTop(menuItem.checked)
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Close',
          accelerator: 'CommandOrControl+W',
          click: () => {
            const window = getLibraryWindow()
            if (window && !window.isDestroyed()) {
              window.close()
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
