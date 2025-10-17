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
