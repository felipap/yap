import { dialog, ipcMain } from 'electron'
import { getOpenaiApiKey, setOpenaiApiKey, store } from '../store'
import { getActiveRecordingsDir } from '../store/default-folder'
import { libraryWindow, settingsWindow } from '../windows'
import { tryCatchIpcMain } from './utils'

export function setupSettingsHandlers() {
  ipcMain.handle(
    'openSettingsWindow',
    tryCatchIpcMain(async () => {
      settingsWindow?.show()
      return { success: true, windowId: settingsWindow?.id || 0 }
    }),
  )

  ipcMain.handle(
    'hideSettingsWindow',
    tryCatchIpcMain(async () => {
      settingsWindow?.hide()
    }),
  )

  ipcMain.handle(
    'getOpenaiApiKey',
    tryCatchIpcMain(async () => {
      return getOpenaiApiKey()
    }),
  )

  ipcMain.handle(
    'setOpenaiApiKey',
    tryCatchIpcMain(async (_, apiKey: string) => {
      setOpenaiApiKey(apiKey)
      return true
    }),
  )

  ipcMain.handle(
    'getUserContext',
    tryCatchIpcMain(async () => {
      return store.get('userContext') || ''
    }),
  )

  ipcMain.handle(
    'setUserContext',
    tryCatchIpcMain(async (_, userContext: string) => {
      store.set('userContext', userContext)
      return true
    }),
  )

  ipcMain.handle(
    'getRecordingsFolder',
    tryCatchIpcMain(async () => {
      return getActiveRecordingsDir()
    }),
  )

  ipcMain.handle(
    'openFolderPicker',
    tryCatchIpcMain(async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Recordings Folder',
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    }),
  )

  ipcMain.handle(
    'getDebugMode',
    tryCatchIpcMain(async () => {
      return store.get('debugMode') || false
    }),
  )

  ipcMain.handle(
    'getSentryEnabled',
    tryCatchIpcMain(async () => {
      return store.get('sentryEnabled') !== false
    }),
  )

  ipcMain.handle(
    'setSentryEnabled',
    tryCatchIpcMain(async (_, enabled: boolean) => {
      store.set('sentryEnabled', enabled)
      return true
    }),
  )

  // Set up state change listener
  store.onDidAnyChange((state) => {
    libraryWindow?.webContents.send('state-changed', state)
  })
}
