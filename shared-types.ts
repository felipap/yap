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
  vlogs?: Record<string, Vlog>
  transcriptionSpeedUp?: boolean
  userProfile?: UserProfile
  wasLastFocused?: boolean
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
  isAudioOnly?: boolean
}

export type RecordingMode = 'screen' | 'camera' | 'both' | 'audio'

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
  startStreamingRecording: (config: any) => Promise<string>
  appendRecordingChunk: (chunk: ArrayBuffer) => Promise<void>
  finalizeStreamingRecording: () => Promise<string>
  startRecording: (config: any) => Promise<string>
  stopRecording: () => Promise<string>
  store: {
    get: <T>(key: string) => Promise<T>
    set: (key: string, value: any) => Promise<void>
  }
  transcribeVideo: (vlogId: string) => Promise<TranscriptionResult>
  getTranscription: (vlogId: string) => Promise<TranscriptionResult | null>
  loadVideoDuration: (vlogId: string) => Promise<number>
  getTranscriptionState: (vlogId: string) => Promise<TranscriptionState>
  getVlog: (vlogId: string) => Promise<any>
  updateVlog: (vlogId: string, updates: any) => Promise<boolean>
  generateVideoSummary: (
    vlogId: string,
    transcription: string,
  ) => Promise<string>
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
  openSettingsWindow: () => Promise<{ success: boolean; windowId: number }>
  getGeminiApiKey: () => Promise<string>
  setGeminiApiKey: (apiKey: string) => Promise<boolean>
  convertToMp4: (vlogId: string) => Promise<{
    success: boolean
    message: string
    newVlogId: string
    outputPath: string
  }>
  getConversionState: (vlogId: string) => Promise<{
    isActive: boolean
    progress: number | null
  }>
  onConversionProgress: (
    callback: (vlogId: string, progress: number) => void,
  ) => void
  removeConversionProgressListener: () => void
}

export type ExposedElectronAPI = SharedIpcMethods & {
  [key: string]: any
  onIpcEvent: (
    channel: string,
    callback: (...args: any[]) => void,
  ) => () => void
  onStateChange: (callback: (state: State) => void) => () => void
}
