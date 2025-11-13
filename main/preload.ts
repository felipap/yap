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

  openFileLocation: (vlogId: string): Promise<void> => {
    return ipcRenderer.invoke('openFileLocation', vlogId)
  },

  untrackVlog: (vlogId: string): Promise<boolean> => {
    return ipcRenderer.invoke('untrackVlog', vlogId)
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

  getVlog: (vlogId: string) => {
    return ipcRenderer.invoke('getVlog', vlogId)
  },
  getEnrichedLog: (vlogId: string) => {
    return ipcRenderer.invoke('getEnrichedLog', vlogId)
  },
  updateVlog: (vlogId: string, updates: any) => {
    return ipcRenderer.invoke('updateVlog', vlogId, updates)
  },
  generateVideoSummary: (
    vlogId: string,
    transcription: string,
  ): Promise<string> => {
    return ipcRenderer.invoke('generateVideoSummary', vlogId, transcription)
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

  getRecordingsFolder: (): Promise<string> => {
    return ipcRenderer.invoke('getRecordingsFolder')
  },

  openFolderPicker: (): Promise<string | null> => {
    return ipcRenderer.invoke('openFolderPicker')
  },

  // Auto-updater event listeners

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

  // Move to default folder
  moveToDefaultFolder: (
    vlogId: string,
  ): Promise<{
    success: boolean
    message: string
    newPath?: string
  }> => {
    return ipcRenderer.invoke('moveToDefaultFolder', vlogId)
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
