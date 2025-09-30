export interface RecordedFile {
  id: string
  name: string
  path: string
  size: number
  created: Date
  modified: Date
  thumbnailPath?: string
}

export type RecordingMode = 'screen' | 'camera' | 'both'

