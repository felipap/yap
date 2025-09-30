import { contextBridge, ipcRenderer } from 'electron'

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
}

export interface RecordedFile {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
}

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: (): Promise<ScreenSource[]> =>
    ipcRenderer.invoke('get-screen-sources'),

  getRecordedFiles: (): Promise<RecordedFile[]> =>
    ipcRenderer.invoke('get-recorded-files'),

  openFileLocation: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('open-file-location', filePath),

  deleteFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-file', filePath),

  saveRecording: (filename: string, buffer: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke('save-recording', filename, buffer),

  store: {
    get: <T>(key: string): Promise<T> =>
      ipcRenderer.invoke('store-get', key),

    set: (key: string, value: any): Promise<void> =>
      ipcRenderer.invoke('store-set', key, value),

    getAll: (): Promise<Record<string, any>> =>
      ipcRenderer.invoke('store-get-all')
  }
})

declare global {
  interface Window {
    electronAPI: {
      getScreenSources: () => Promise<ScreenSource[]>
      getRecordedFiles: () => Promise<RecordedFile[]>
      openFileLocation: (filePath: string) => Promise<void>
      deleteFile: (filePath: string) => Promise<boolean>
      saveRecording: (filename: string, buffer: ArrayBuffer) => Promise<string>
      store: {
        get: <T>(key: string) => Promise<T>
        set: (key: string, value: any) => Promise<void>
        getAll: () => Promise<Record<string, any>>
      }
    }
  }
}
