import { app, Menu } from 'electron'
import { libraryWindow } from './windows'

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
        {
          label: 'Transcribe five more',
          click: async () => {
            if (libraryWindow) {
              try {
                const result =
                  await libraryWindow.webContents.executeJavaScript(
                    `window.electronAPI.transcribeNextFive()`,
                  )
                console.log(
                  `Started transcribing ${result.started} items (${result.total} total need transcription)`,
                )
              } catch (error) {
                console.error('Failed to transcribe next 5:', error)
              }
            }
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
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
            if (libraryWindow && !libraryWindow.isDestroyed()) {
              libraryWindow.hide()
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
