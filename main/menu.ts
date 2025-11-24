import { app, Menu } from 'electron'
import { getLibraryWindow } from './windows/library'

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
            console.log('Menu close handler called')
            const window = getLibraryWindow()
            if (window && !window.isDestroyed()) {
              console.log('Calling window.close()')
              // Call window.close() instead of window.hide() to trigger the
              // 'close' event, which allows the close handler in library.ts to
              // show a confirmation dialog when a recording is in progress
              window.close()
            } else {
              console.log('Window not available or destroyed')
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
