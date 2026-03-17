import { desktopCapturer, ipcMain } from 'electron'
import { State } from '../../shared-types'
import { store } from '../store'
import { onChangeTopLevelPage } from '../windows'
import { tryCatchIpcMain } from './utils'

export function setupStoreHandlers() {
  ipcMain.handle(
    'getScreenSources',
    tryCatchIpcMain(async () => {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
      })
      return sources
    }),
  )

  ipcMain.handle(
    'getState',
    tryCatchIpcMain(async () => {
      return store.store
    }),
  )

  ipcMain.handle(
    'setPartialState',
    tryCatchIpcMain(async (_, state: Partial<State>) => {
      store.set(state)
    }),
  )

  ipcMain.handle(
    'storeGet',
    tryCatchIpcMain((_, key: string) => {
      return store.get(key)
    }),
  )

  ipcMain.handle(
    'storeSet',
    tryCatchIpcMain(async (_, key: string, value: any) => {
      store.set(key, value)
    }),
  )

  ipcMain.handle(
    'onChangeTopLevelPage',
    tryCatchIpcMain(async (_, page: 'library' | 'record') => {
      onChangeTopLevelPage(page)
    }),
  )
}
