export interface RecordedFile {
  id: string
  name: string
  path: string
  size: number
  created: Date
  modified: Date
}

export type RecordingMode = 'screen' | 'camera' | 'both'

