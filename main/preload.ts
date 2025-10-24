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

  getScreenSources: (): Promise<ScreenSource[]> => {
    return ipcRenderer.invoke('getScreenSources')
  },

  getRecordedFiles: (): Promise<RecordedFile[]> => {
    return ipcRenderer.invoke('getRecordedFiles')
  },

  openFileLocation: (vlogId: string): Promise<void> => {
    return ipcRenderer.invoke('openFileLocation', vlogId)
  },

  untrackVlog: (vlogId: string): Promise<boolean> => {
    return ipcRenderer.invoke('untrackVlog', vlogId)
  },

  saveRecording: (filename: string, buffer: ArrayBuffer): Promise<string> => {
    return ipcRenderer.invoke('saveRecording', filename, buffer)
  },

  // Crash protection methods
  saveRecordingChunk: (
    recordingId: string,
    buffer: ArrayBuffer,
  ): Promise<string> => {
    return ipcRenderer.invoke('saveRecordingChunk', recordingId, buffer)
  },

  getRecordingChunks: (recordingId: string): Promise<string[]> => {
    return ipcRenderer.invoke('getRecordingChunks', recordingId)
  },

  cleanupRecordingChunks: (recordingId: string): Promise<boolean> => {
    return ipcRenderer.invoke('cleanupRecordingChunks', recordingId)
  },

  recoverIncompleteRecordings: (): Promise<string[]> => {
    return ipcRenderer.invoke('recoverIncompleteRecordings')
  },

  // New recording system methods
  startRecording: (config: any): Promise<string> => {
    return ipcRenderer.invoke('startRecording', config)
  },

  stopRecording: (): Promise<string> => {
    return ipcRenderer.invoke('stopRecording')
  },

  getRecordingState: (): Promise<any> => {
    return ipcRenderer.invoke('getRecordingState')
  },

  emergencySaveRecording: (): Promise<void> => {
    return ipcRenderer.invoke('emergencySaveRecording')
  },

  store: {
    get: <T>(key: string): Promise<T> => {
      return ipcRenderer.invoke('storeGet', key)
    },

    set: (key: string, value: any): Promise<void> => {
      return ipcRenderer.invoke('storeSet', key, value)
    },

    getAll: (): Promise<Record<string, any>> => {
      return ipcRenderer.invoke('storeGetAll')
    },
  },

  // Transcription functions
  transcribeVideo: (vlogId: string): Promise<TranscriptionResult> => {
    return ipcRenderer.invoke('transcribeVideo', vlogId)
  },

  getTranscription: (vlogId: string): Promise<TranscriptionResult | null> => {
    return ipcRenderer.invoke('getTranscription', vlogId)
  },

  loadVideoDuration: (vlogId: string): Promise<number> => {
    return ipcRenderer.invoke('loadVideoDuration', vlogId)
  },

  getTranscriptionState: (vlogId: string): Promise<TranscriptionState> => {
    return ipcRenderer.invoke('getTranscriptionState', vlogId)
  },

  getAllTranscriptionStates: (): Promise<
    Record<string, TranscriptionState>
  > => {
    return ipcRenderer.invoke('getAllTranscriptionStates')
  },
  getVlog: (vlogId: string) => {
    return ipcRenderer.invoke('getVlog', vlogId)
  },
  getAllVlogs: () => {
    return ipcRenderer.invoke('getAllVlogs')
  },
  updateVlog: (vlogId: string, updates: any) => {
    return ipcRenderer.invoke('updateVlog', vlogId, updates)
  },
  getTranscriptionSpeedUp: () => {
    return ipcRenderer.invoke('getTranscriptionSpeedUp')
  },
  setTranscriptionSpeedUp: (speedUp: boolean) => {
    return ipcRenderer.invoke('setTranscriptionSpeedUp', speedUp)
  },
  generateVideoSummary: (
    vlogId: string,
    transcription: string,
  ): Promise<string> => {
    return ipcRenderer.invoke('generateVideoSummary', vlogId, transcription)
  },
  saveVideoSummary: (vlogId: string, summary: string): Promise<void> => {
    return ipcRenderer.invoke('saveVideoSummary', vlogId, summary)
  },
  importVideoFile: (filePath: string): Promise<any> => {
    return ipcRenderer.invoke('importVideoFile', filePath)
  },

  // Video position functions
  saveVideoPosition: (vlogId: string, position: number): Promise<boolean> => {
    return ipcRenderer.invoke('saveVideoPosition', vlogId, position)
  },

  getVideoPosition: (
    vlogId: string,
  ): Promise<{ position: number; timestamp: string } | null> => {
    return ipcRenderer.invoke('getVideoPosition', vlogId)
  },

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
  checkForUpdates: (): Promise<{ available: boolean; message: string }> => {
    return ipcRenderer.invoke('checkForUpdates')
  },

  downloadUpdate: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('downloadUpdate')
  },

  installUpdate: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('installUpdate')
  },

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('getAppVersion')
  },

  // Settings functions
  openSettingsWindow: (): Promise<{ success: boolean; windowId: number }> => {
    return ipcRenderer.invoke('openSettingsWindow')
  },

  getGeminiApiKey: (): Promise<string> => {
    return ipcRenderer.invoke('getGeminiApiKey')
  },

  setGeminiApiKey: (apiKey: string): Promise<boolean> => {
    return ipcRenderer.invoke('setGeminiApiKey', apiKey)
  },

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

  // MP4 conversion
  convertToMp4: (
    vlogId: string,
  ): Promise<{
    success: boolean
    message: string
    newVlogId: string
    outputPath: string
  }> => {
    return ipcRenderer.invoke('convertToMp4', vlogId)
  },

  getConversionState: (
    vlogId: string,
  ): Promise<{
    isActive: boolean
    progress: number | null
  }> => {
    return ipcRenderer.invoke('getConversionState', vlogId)
  },

  onConversionProgress: (
    callback: (vlogId: string, progress: number) => void,
  ) => {
    ipcRenderer.on('conversion-progress', (_, vlogId, progress) =>
      callback(vlogId, progress),
    )
  },

  removeConversionProgressListener: () => {
    ipcRenderer.removeAllListeners('conversion-progress')
  },
} satisfies ExposedElectronAPI)

declare global {
  interface Window {
    electronAPI: SharedIpcMethods
  }
}
