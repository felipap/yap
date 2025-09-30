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

export interface Vlog {
  id: string
  name: string
  path: string
  timestamp: string
  transcription?: TranscriptionState
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
}

export type RecordingMode = 'screen' | 'camera' | 'both'

