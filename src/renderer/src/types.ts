// Re-export shared types
export * from '../../shared-types'
import { TranscriptionState } from '../../shared-types'

// Vlog interface specific to the store (different from RecordedFile)
export interface Vlog {
  id: string
  name: string
  path: string
  timestamp: string
  transcription?: TranscriptionState
  summary?: string
  duration?: number
}
