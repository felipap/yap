import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  saveBackgroundRecording: (buffer: ArrayBuffer) =>
    ipcRenderer.invoke('save-background-recording', buffer),
})
