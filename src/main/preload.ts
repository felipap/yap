import { contextBridge, ipcRenderer } from 'electron'
import {
  ExposedElectronAPI,
  RecordedFile,
  ScreenSource,
  SharedIpcMethods,
  State,
  TranscriptionResult,
  TranscriptionState,
} from '../shared-types'

contextBridge.exposeInMainWorld('electronAPI', {
  onIpcEvent: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  getState: (): Promise<State> => ipcRenderer.invoke('getState'),

  setPartialState: (state: Partial<State>): Promise<void> =>
    ipcRenderer.invoke('setPartialState', state),

  onStateChange: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state)
    ipcRenderer.on('state-changed', listener)
    return () => {
      ipcRenderer.removeListener('state-changed', listener)
    }
  },

  getScreenSources: (): Promise<ScreenSource[]> =>
    ipcRenderer.invoke('get-screen-sources'),

  getRecordedFiles: (): Promise<RecordedFile[]> =>
    ipcRenderer.invoke('get-recorded-files'),

  openFileLocation: (vlogId: string): Promise<void> =>
    ipcRenderer.invoke('open-file-location', vlogId),

  untrackVlog: (vlogId: string): Promise<boolean> =>
    ipcRenderer.invoke('untrack-vlog', vlogId),

  saveRecording: (filename: string, buffer: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke('save-recording', filename, buffer),

  store: {
    get: <T>(key: string): Promise<T> => ipcRenderer.invoke('store-get', key),

    set: (key: string, value: any): Promise<void> =>
      ipcRenderer.invoke('store-set', key, value),

    getAll: (): Promise<Record<string, any>> =>
      ipcRenderer.invoke('store-get-all'),
  },

  // Transcription functions
  transcribeVideo: (vlogId: string): Promise<TranscriptionResult> =>
    ipcRenderer.invoke('transcribe-video', vlogId),

  getTranscription: (vlogId: string): Promise<TranscriptionResult | null> =>
    ipcRenderer.invoke('get-transcription', vlogId),

  loadVideoDuration: (vlogId: string): Promise<number> =>
    ipcRenderer.invoke('loadVideoDuration', vlogId),

  getTranscriptionState: (vlogId: string): Promise<TranscriptionState> =>
    ipcRenderer.invoke('get-transcription-state', vlogId),

  getAllTranscriptionStates: (): Promise<Record<string, TranscriptionState>> =>
    ipcRenderer.invoke('get-all-transcription-states'),
  getVlog: (vlogId: string) => ipcRenderer.invoke('get-vlog', vlogId),
  getAllVlogs: () => ipcRenderer.invoke('get-all-vlogs'),
  updateVlog: (vlogId: string, updates: any) =>
    ipcRenderer.invoke('update-vlog', vlogId, updates),
  getTranscriptionSpeedUp: () =>
    ipcRenderer.invoke('get-transcription-speed-up'),
  setTranscriptionSpeedUp: (speedUp: boolean) =>
    ipcRenderer.invoke('set-transcription-speed-up', speedUp),
  generateVideoSummary: (
    vlogId: string,
    transcription: string,
  ): Promise<string> =>
    ipcRenderer.invoke('generate-video-summary', vlogId, transcription),
  saveVideoSummary: (vlogId: string, summary: string): Promise<void> =>
    ipcRenderer.invoke('save-video-summary', vlogId, summary),
  importVideoFile: (filePath: string): Promise<any> =>
    ipcRenderer.invoke('import-video-file', filePath),

  // Video position functions
  saveVideoPosition: (vlogId: string, position: number): Promise<boolean> =>
    ipcRenderer.invoke('save-video-position', vlogId, position),

  getVideoPosition: (
    vlogId: string,
  ): Promise<{ position: number; timestamp: string } | null> =>
    ipcRenderer.invoke('get-video-position', vlogId),

  // Event listeners for real-time updates
  onVlogUpdated: (callback: (vlogId: string) => void) => {
    ipcRenderer.on('vlog-updated', (_, vlogId) => callback(vlogId))
  },

  removeVlogUpdatedListener: () => {
    ipcRenderer.removeAllListeners('vlog-updated')
  },

  onSummaryGenerated: (callback: (vlogId: string, summary: string) => void) => {
    ipcRenderer.on('summary-generated', (_, vlogId, summary) =>
      callback(vlogId, summary),
    )
  },

  removeSummaryGeneratedListener: (
    callback: (vlogId: string, summary: string) => void,
  ) => {
    ipcRenderer.removeAllListeners('summary-generated')
  },

  // Transcription progress events
  onTranscriptionProgressUpdated: (
    callback: (vlogId: string, progress: number) => void,
  ) => {
    ipcRenderer.on('transcription-progress-updated', (_, vlogId, progress) =>
      callback(vlogId, progress),
    )
  },

  removeTranscriptionProgressListener: (
    callback: (vlogId: string, progress: number) => void,
  ) => {
    ipcRenderer.removeAllListeners('transcription-progress-updated')
  },

  // Auto-updater functions
  checkForUpdates: (): Promise<{ available: boolean; message: string }> =>
    ipcRenderer.invoke('check-for-updates'),

  downloadUpdate: (): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('download-update'),

  installUpdate: (): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('install-update'),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  // Auto-updater event listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
  },

  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_, progress) => callback(progress))
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
  },

  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('download-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
  },
} satisfies ExposedElectronAPI)

declare global {
  interface Window {
    electronAPI: SharedIpcMethods
  }
}
