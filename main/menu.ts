import { app, BrowserWindow, Menu } from 'electron'
import { getLibraryWindow } from './windows/library'
import { exportTranscripts } from './export-transcripts'
import { store } from './store'

export function setupMenu() {
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
      label: 'Window',
      submenu: [
        { role: 'minimize' },
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
