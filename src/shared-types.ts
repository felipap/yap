export interface TranscriptionState {
  status: 'idle' | 'transcribing' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: any
  startTime?: number
}

export interface Vlog {
  id: string
  name: string
  path: string
  timestamp: string
  title?: string
  transcription?: TranscriptionState
  summary?: string
  lastPosition?: number
  lastPositionTimestamp?: string
  duration?: number // Cached video duration in seconds
}

export interface UserProfile {
  name: string
  role: string
  interests: string[]
  languages: string[]
  context: string
}

export interface State {
  selectedCameraId: string
  recordingMode: 'camera' | 'screen' | 'both'
  globalVideoMute: boolean
  globalPlaybackSpeed: number
  openaiApiKey?: string
  geminiApiKey?: string
  windowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
  }
  vlogs?: Record<string, Vlog>
  transcriptionSpeedUp?: boolean
  userProfile?: UserProfile
}

//
//
//
//
//

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

export interface RecordedFile {
  id: string
  name: string
  path: string
  size: number
  created: Date
  title?: string
  modified: Date
  thumbnailPath?: string
  duration?: number
  transcription?: TranscriptionResult
  summary?: string
}

export type RecordingMode = 'screen' | 'camera' | 'both'

export interface ImportResult {
  success: boolean
  isDuplicate: boolean
  message: string
  vlog?: RecordedFile
  existingVlog?: RecordedFile
}

export type SharedIpcMethods = {
  getScreenSources: () => Promise<ScreenSource[]>
  getRecordedFiles: () => Promise<RecordedFile[]>
  openFileLocation: (vlogId: string) => Promise<void>
  setPartialState: (state: Partial<State>) => Promise<void>
  getState: () => Promise<State>
  untrackVlog: (vlogId: string) => Promise<boolean>
  saveRecording: (filename: string, buffer: ArrayBuffer) => Promise<string>
  store: {
    get: <T>(key: string) => Promise<T>
    set: (key: string, value: any) => Promise<void>
    getAll: () => Promise<Record<string, any>>
  }
  transcribeVideo: (vlogId: string) => Promise<TranscriptionResult>
  getTranscription: (vlogId: string) => Promise<TranscriptionResult | null>
  loadVideoDuration: (vlogId: string) => Promise<number>
  getTranscriptionState: (vlogId: string) => Promise<TranscriptionState>
  getAllTranscriptionStates: () => Promise<Record<string, TranscriptionState>>
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
  importVideoFile: (filePath: string) => Promise<any>
  saveVideoPosition: (vlogId: string, position: number) => Promise<boolean>
  getVideoPosition: (
    vlogId: string,
  ) => Promise<{ position: number; timestamp: string } | null>
  onSummaryGenerated: (
    callback: (vlogId: string, summary: string) => void,
  ) => void
  removeSummaryGeneratedListener: (
    callback: (vlogId: string, summary: string) => void,
  ) => void
  onTranscriptionProgressUpdated: (
    callback: (vlogId: string, progress: number) => void,
  ) => void
  removeTranscriptionProgressListener: (
    callback: (vlogId: string, progress: number) => void,
  ) => void
  onStateChange: (callback: (state: any) => void) => () => void
  onVlogUpdated: (callback: (vlogId: string) => void) => void
  removeVlogUpdatedListener: () => void
  checkForUpdates: () => Promise<{ available: boolean; message: string }>
  downloadUpdate: () => Promise<{ success: boolean; message: string }>
  installUpdate: () => Promise<{ success: boolean; message: string }>
  getAppVersion: () => Promise<string>
  openSettingsWindow: () => Promise<{ success: boolean; windowId: number }>
  getGeminiApiKey: () => Promise<string>
  setGeminiApiKey: (apiKey: string) => Promise<boolean>
  onUpdateAvailable: (callback: (info: any) => void) => void
  onDownloadProgress: (callback: (progress: any) => void) => void
  onUpdateDownloaded: (callback: (info: any) => void) => void
  removeUpdateListeners: () => void
}

export type ExposedElectronAPI = SharedIpcMethods & {
  [key: string]: any
  onIpcEvent: (
    channel: string,
    callback: (...args: any[]) => void,
  ) => () => void
  onStateChange: (callback: (state: State) => void) => () => void
}
