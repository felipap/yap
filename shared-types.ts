export interface TranscriptionState {
  status: 'idle' | 'transcribing' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: any
  startTime?: number
}

/**
 * Log type - the raw data structure stored in data.json
 * This is the persisted representation of a recording.
 */
export interface Log {
  id: string
  name: string
  path: string
  timestamp: string // ISO 8601 string
  title?: string
  transcription?: TranscriptionState
  summary?: string
  lastPosition?: number
  lastPositionTimestamp?: string
  duration?: number // Cached video duration in seconds
  isAudioOnly?: boolean
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
  recordingMode: 'camera' | 'screen' | 'both' | 'audio'
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
  previousWindowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
  }
  logs?: Record<string, Log>
  transcriptionSpeedUp?: boolean
  userProfile?: UserProfile
  wasLastFocused?: boolean
  recordingsFolder?: string
  userContext?: string
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

/**
 * EnrichedLog type - the enriched data structure returned to the frontend
 * This is computed from Log + file system stats at runtime.
 * Used by the UI but not stored directly in data.json.
 */
export interface EnrichedLog {
  id: string
  name: string
  path: string
  // size: number // Computed from file stats
  created: Date // Computed from Log.timestamp
  title?: string
  // modified: Date // Computed from file stats
  thumbnailPath?: string // Computed as log-thumbnail://{id}.jpg
  duration?: number
  transcription?: TranscriptionResult
  summary?: string
  isAudioOnly?: boolean
  fileExists: boolean // Computed at runtime - true if file exists on disk
  isInDefaultFolder: boolean // Computed at runtime - true if file is in default recordings folder
}

export type RecordingMode = 'screen' | 'camera' | 'both' | 'audio'

export interface ImportResult {
  success: boolean
  isDuplicate: boolean
  message: string
  log?: EnrichedLog
  existingLog?: EnrichedLog
}

export type SharedIpcMethods = {
  getScreenSources: () => Promise<ScreenSource[]>
  getEnrichedLogs: () => Promise<EnrichedLog[]>
  openFileLocation: (logId: string) => Promise<void>
  setPartialState: (state: Partial<State>) => Promise<void>
  getState: () => Promise<State>
  untrackLog: (logId: string) => Promise<boolean>
  saveRecording: (filename: string, buffer: ArrayBuffer) => Promise<string>
  startStreamingRecording: (config: any) => Promise<string>
  appendRecordingChunk: (chunk: ArrayBuffer) => Promise<void>
  finalizeStreamingRecording: () => Promise<string>
  startRecording: (config: any) => Promise<string>
  stopRecording: () => Promise<string>
  store: {
    get: <T>(key: string) => Promise<T>
    set: (key: string, value: any) => Promise<void>
  }
  transcribeVideo: (logId: string) => Promise<TranscriptionResult>
  getTranscription: (logId: string) => Promise<TranscriptionResult | null>
  getTranscriptionState: (logId: string) => Promise<TranscriptionState>
  getLog: (logId: string) => Promise<any>
  getEnrichedLog: (logId: string) => Promise<EnrichedLog>
  updateLog: (logId: string, updates: any) => Promise<boolean>
  generateVideoSummary: (
    logId: string,
    transcription: string,
  ) => Promise<string>
  importVideoFile: (filePath: string) => Promise<any>
  saveVideoPosition: (logId: string, position: number) => Promise<boolean>
  getVideoPosition: (
    logId: string,
  ) => Promise<{ position: number; timestamp: string } | null>
  onViewLogEntry: (logId: string) => Promise<void>
  onSummaryGenerated: (
    callback: (logId: string, summary: string) => void,
  ) => void
  removeSummaryGeneratedListener: (
    callback: (logId: string, summary: string) => void,
  ) => void
  onTranscriptionProgressUpdated: (
    callback: (logId: string, progress: number) => void,
  ) => void
  removeTranscriptionProgressListener: (
    callback: (logId: string, progress: number) => void,
  ) => void
  onStateChange: (callback: (state: any) => void) => () => void
  onLogUpdated: (callback: (logId: string) => void) => void
  removeLogUpdatedListener: () => void
  openSettingsWindow: () => Promise<{ success: boolean; windowId: number }>
  hideSettingsWindow: () => Promise<void>
  getGeminiApiKey: () => Promise<string>
  setGeminiApiKey: (apiKey: string) => Promise<boolean>
  getUserContext: () => Promise<string>
  setUserContext: (userContext: string) => Promise<boolean>
  getRecordingsFolder: () => Promise<string>
  openFolderPicker: () => Promise<string | null>
  convertToMp4: (logId: string) => Promise<{
    success: boolean
    message: string
    newLogId: string
    outputPath: string
  }>
  getConversionState: (logId: string) => Promise<{
    isActive: boolean
    progress: number | null
  }>
  onConversionProgress: (
    callback: (logId: string, progress: number) => void,
  ) => void
  removeConversionProgressListener: () => void
  moveToDefaultFolder: (logId: string) => Promise<{
    success: boolean
    message: string
    newPath?: string
  }>
  onChangeTopLevelPage: (page: 'library' | 'record') => Promise<void>
}

export type ExposedElectronAPI = SharedIpcMethods & {
  [key: string]: any
  onIpcEvent: (
    channel: string,
    callback: (...args: any[]) => void,
  ) => () => void
  onStateChange: (callback: (state: State) => void) => () => void
}
