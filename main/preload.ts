import { contextBridge, ipcRenderer } from 'electron'
import {
  ExposedElectronAPI,
  EnrichedLog,
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

  getEnrichedLogs: (): Promise<EnrichedLog[]> => {
    return ipcRenderer.invoke('getEnrichedLogs')
  },

  openFileLocation: (logId: string): Promise<void> => {
    return ipcRenderer.invoke('openFileLocation', logId)
  },

  untrackLog: (logId: string): Promise<boolean> => {
    return ipcRenderer.invoke('untrackLog', logId)
  },

  saveRecording: (filename: string, buffer: ArrayBuffer): Promise<string> => {
    return ipcRenderer.invoke('saveRecording', filename, buffer)
  },

  // New recording system methods
  startRecording: (config: any): Promise<string> => {
    return ipcRenderer.invoke('startRecording', config)
  },

  stopRecording: (): Promise<string> => {
    return ipcRenderer.invoke('stopRecording')
  },

  store: {
    get: <T>(key: string): Promise<T> => {
      return ipcRenderer.invoke('storeGet', key)
    },

    set: (key: string, value: any): Promise<void> => {
      return ipcRenderer.invoke('storeSet', key, value)
    },
  },

  // Transcription functions
  transcribeVideo: (logId: string): Promise<TranscriptionResult> => {
    return ipcRenderer.invoke('transcribeVideo', logId)
  },

  getTranscription: (logId: string): Promise<TranscriptionResult | null> => {
    return ipcRenderer.invoke('getTranscription', logId)
  },

  getTranscriptionState: (logId: string): Promise<TranscriptionState> => {
    return ipcRenderer.invoke('getTranscriptionState', logId)
  },

  getLog: (logId: string) => {
    return ipcRenderer.invoke('getLog', logId)
  },
  getEnrichedLog: (logId: string) => {
    return ipcRenderer.invoke('getEnrichedLog', logId)
  },
  updateLog: (logId: string, updates: any) => {
    return ipcRenderer.invoke('updateLog', logId, updates)
  },
  generateVideoSummary: (
    logId: string,
    transcription: string,
  ): Promise<string> => {
    return ipcRenderer.invoke('generateVideoSummary', logId, transcription)
  },
  importVideoFile: (filePath: string): Promise<any> => {
    return ipcRenderer.invoke('importVideoFile', filePath)
  },

  // Video position functions
  saveVideoPosition: (logId: string, position: number): Promise<boolean> => {
    return ipcRenderer.invoke('saveVideoPosition', logId, position)
  },

  getVideoPosition: (
    logId: string,
  ): Promise<{ position: number; timestamp: string } | null> => {
    return ipcRenderer.invoke('getVideoPosition', logId)
  },

  onViewLogEntry: (logId: string): Promise<void> => {
    return ipcRenderer.invoke('onViewLogEntry', logId)
  },

  // Event listeners for real-time updates
  onLogUpdated: (callback: (logId: string) => void) => {
    ipcRenderer.on('log-updated', (_, logId) => callback(logId))
  },

  removeLogUpdatedListener: () => {
    ipcRenderer.removeAllListeners('log-updated')
  },

  onSummaryGenerated: (callback: (logId: string, summary: string) => void) => {
    ipcRenderer.on('summary-generated', (_, logId, summary) =>
      callback(logId, summary),
    )
  },

  removeSummaryGeneratedListener: (
    callback: (logId: string, summary: string) => void,
  ) => {
    ipcRenderer.removeAllListeners('summary-generated')
  },

  // Transcription progress events
  onTranscriptionProgressUpdated: (
    callback: (logId: string, progress: number) => void,
  ) => {
    ipcRenderer.on('transcription-progress-updated', (_, logId, progress) =>
      callback(logId, progress),
    )
  },

  removeTranscriptionProgressListener: (
    callback: (logId: string, progress: number) => void,
  ) => {
    ipcRenderer.removeAllListeners('transcription-progress-updated')
  },

  // Settings functions
  openSettingsWindow: (): Promise<{ success: boolean; windowId: number }> => {
    return ipcRenderer.invoke('openSettingsWindow')
  },

  hideSettingsWindow: (): Promise<void> => {
    return ipcRenderer.invoke('hideSettingsWindow')
  },

  getGeminiApiKey: (): Promise<string> => {
    return ipcRenderer.invoke('getGeminiApiKey')
  },

  setGeminiApiKey: (apiKey: string): Promise<boolean> => {
    return ipcRenderer.invoke('setGeminiApiKey', apiKey)
  },

  getUserContext: (): Promise<string> => {
    return ipcRenderer.invoke('getUserContext')
  },

  setUserContext: (userContext: string): Promise<boolean> => {
    return ipcRenderer.invoke('setUserContext', userContext)
  },

  getRecordingsFolder: (): Promise<string> => {
    return ipcRenderer.invoke('getRecordingsFolder')
  },

  openFolderPicker: (): Promise<string | null> => {
    return ipcRenderer.invoke('openFolderPicker')
  },

  // Auto-updater event listeners

  // MP4 conversion
  convertToMp4: (
    logId: string,
  ): Promise<{
    success: boolean
    message: string
    newLogId: string
    outputPath: string
  }> => {
    return ipcRenderer.invoke('convertToMp4', logId)
  },

  getConversionState: (
    logId: string,
  ): Promise<{
    isActive: boolean
    progress: number | null
  }> => {
    return ipcRenderer.invoke('getConversionState', logId)
  },

  onConversionProgress: (
    callback: (logId: string, progress: number) => void,
  ) => {
    ipcRenderer.on('conversion-progress', (_, logId, progress) =>
      callback(logId, progress),
    )
  },

  removeConversionProgressListener: () => {
    ipcRenderer.removeAllListeners('conversion-progress')
  },

  // Move to default folder
  moveToDefaultFolder: (
    logId: string,
  ): Promise<{
    success: boolean
    message: string
    newPath?: string
  }> => {
    return ipcRenderer.invoke('moveToDefaultFolder', logId)
  },

  // Window management
  onChangeTopLevelPage: (page: 'library' | 'record'): Promise<void> => {
    return ipcRenderer.invoke('onChangeTopLevelPage', page)
  },

  //
  //
  //
  //

  // Streaming recording methods
  startStreamingRecording: (config: any): Promise<string> => {
    return ipcRenderer.invoke('startStreamingRecording', config)
  },
  appendRecordingChunk: (chunk: ArrayBuffer): Promise<void> => {
    return ipcRenderer.invoke('appendRecordingChunk', chunk)
  },
  finalizeStreamingRecording: (): Promise<string> => {
    return ipcRenderer.invoke('finalizeStreamingRecording')
  },
} satisfies ExposedElectronAPI)

declare global {
  interface Window {
    electronAPI: SharedIpcMethods
  }
}
