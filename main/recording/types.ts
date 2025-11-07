export type RecordingMode = 'screen' | 'camera' | 'both' | 'audio'

export interface RecordingConfig {
  mode: RecordingMode
  cameraId: string
  microphoneId: string
}

export interface RecordingState {
  isRecording: boolean
  recordingId: string | null
  startTime: number | null
  duration: number
}

export interface RecordingChunk {
  recordingId: string
  chunkIndex: number
  timestamp: number
  data: ArrayBuffer
}
