import { contextBridge, ipcRenderer } from 'electron'

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language?: string
  duration: number
}

export interface TranscriptionState {
  status: 'idle' | 'transcribing' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: TranscriptionResult
  startTime?: number
}

export interface RecordedFile {
  id: string
  name: string
  path: string
  size: number
  created: Date
  modified: Date
  thumbnailPath?: string
  transcription?: TranscriptionResult
  summary?: string
}

contextBridge.exposeInMainWorld('electronAPI', {
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

  getVideoDuration: (vlogId: string): Promise<number> =>
    ipcRenderer.invoke('get-video-duration', vlogId),

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
  importVideoFile: (filePath: string): Promise<RecordedFile> =>
    ipcRenderer.invoke('import-video-file', filePath),
})

declare global {
  interface Window {
    electronAPI: {
      getScreenSources: () => Promise<ScreenSource[]>
      getRecordedFiles: () => Promise<RecordedFile[]>
      openFileLocation: (vlogId: string) => Promise<void>
      untrackVlog: (vlogId: string) => Promise<boolean>
      saveRecording: (filename: string, buffer: ArrayBuffer) => Promise<string>
      store: {
        get: <T>(key: string) => Promise<T>
        set: (key: string, value: any) => Promise<void>
        getAll: () => Promise<Record<string, any>>
      }
      transcribeVideo: (vlogId: string) => Promise<TranscriptionResult>
      getTranscription: (vlogId: string) => Promise<TranscriptionResult | null>
      getVideoDuration: (vlogId: string) => Promise<number>
      getTranscriptionState: (vlogId: string) => Promise<TranscriptionState>
      getAllTranscriptionStates: () => Promise<
        Record<string, TranscriptionState>
      >
      getVlog: (vlogId: string) => Promise<any>
      getAllVlogs: () => Promise<Record<string, any>>
      updateVlog: (vlogId: string, updates: any) => Promise<boolean>
      getTranscriptionSpeedUp: () => Promise<boolean>
      setTranscriptionSpeedUp: (speedUp: boolean) => Promise<boolean>
      generateVideoSummary: (
        vlogId: string,
        transcription: string,
      ) => Promise<string>
      saveVideoSummary: (vlogId: string, summary: string) => Promise<void>
      importVideoFile: (filePath: string) => Promise<RecordedFile>
    }
  }
}
