import { contextBridge, ipcRenderer } from 'electron'
import {
  ExposedElectronAPI,
  ScreenSource,
  SharedIpcMethods,
  SidebarLog,
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
    const listener = (_event: any, state: any) => {
      callback(state)
    }
    ipcRenderer.on('state-changed', listener)
    return () => {
      ipcRenderer.removeListener('state-changed', listener)
    }
  },

  getScreenSources: (): Promise<ScreenSource[]> => {
    return ipcRenderer.invoke('getScreenSources')
  },

  getSidebarLogs: (): Promise<SidebarLog[]> => {
    return ipcRenderer.invoke('getSidebarLogs')
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
  triggerGenerateSummary: (logId: string): Promise<void> => {
    return ipcRenderer.invoke('triggerGenerateSummary', logId)
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
    const listener = (_event: any, logId: string) => callback(logId)
    ipcRenderer.on('log-updated', listener)
    return () => {
      ipcRenderer.removeListener('log-updated', listener)
    }
  },

  onSummaryGenerated: (callback: (logId: string, summary: string) => void) => {
    const listener = (_event: any, logId: string, summary: string) =>
      callback(logId, summary)
    ipcRenderer.on('summary-generated', listener)
    return () => {
      ipcRenderer.removeListener('summary-generated', listener)
    }
  },

  // Transcription progress events
  onTranscriptionProgressUpdated: (
    callback: (logId: string, progress: number) => void,
  ) => {
    const listener = (_event: any, logId: string, progress: number) =>
      callback(logId, progress)
    ipcRenderer.on('transcription-progress-updated', listener)
    return () => {
      ipcRenderer.removeListener('transcription-progress-updated', listener)
    }
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

  getOpenaiApiKey: (): Promise<string> => {
    return ipcRenderer.invoke('getOpenaiApiKey')
  },

  setOpenaiApiKey: (apiKey: string): Promise<boolean> => {
    return ipcRenderer.invoke('setOpenaiApiKey', apiKey)
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
    const listener = (_event: any, logId: string, progress: number) =>
      callback(logId, progress)
    ipcRenderer.on('conversion-progress', listener)
    return () => {
      ipcRenderer.removeListener('conversion-progress', listener)
    }
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

  // Debug mode
  getDebugMode: (): Promise<boolean> => {
    return ipcRenderer.invoke('getDebugMode')
  },

  openTranscriptionFile: (logId: string): Promise<void> => {
    return ipcRenderer.invoke('openTranscriptionFile', logId)
  },

  openSummaryFile: (logId: string): Promise<void> => {
    return ipcRenderer.invoke('openSummaryFile', logId)
  },

  shuffleThumbnail: (logId: string): Promise<boolean> => {
    return ipcRenderer.invoke('shuffleThumbnail', logId)
  },

  onDebugModeChanged: (callback: (enabled: boolean) => void) => {
    const listener = (_event: any, enabled: boolean) => callback(enabled)
    ipcRenderer.on('debug-mode-changed', listener)
    return () => {
      ipcRenderer.removeListener('debug-mode-changed', listener)
    }
  },

  // Sentry error reporting
  getSentryEnabled: (): Promise<boolean> => {
    return ipcRenderer.invoke('getSentryEnabled')
  },

  setSentryEnabled: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('setSentryEnabled', enabled)
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
  requestSwitchToLibrary: (): Promise<{
    allowed: boolean
    wasRecording: boolean
  }> => {
    return ipcRenderer.invoke('requestSwitchToLibrary')
  },
  updateCameraMenuState: (state: {
    cameras?: Array<{ id: string; label: string }>
    selectedCameraId?: string
    automaticCameraSelection?: boolean
    enableScreenFlash?: boolean
  }): Promise<void> => {
    return ipcRenderer.invoke('updateCameraMenuState', state)
  },
  updateMicrophoneMenuState: (state: {
    microphones?: Array<{ id: string; label: string }>
    selectedMicrophoneId?: string
    automaticMicrophoneSelection?: boolean
  }): Promise<void> => {
    return ipcRenderer.invoke('updateMicrophoneMenuState', state)
  },
} satisfies ExposedElectronAPI)

declare global {
  interface Window {
    electronAPI: SharedIpcMethods
  }
}
