import Store, { Schema } from 'electron-store'

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
  transcription?: TranscriptionState
}

export interface AppSettings {
  selectedCameraId: string
  recordingMode: 'camera' | 'screen' | 'both'
  openaiApiKey?: string
  windowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
  }
  vlogs?: Record<string, Vlog>
  transcriptionSpeedUp?: boolean
}

const schema: Schema<AppSettings> = {
  selectedCameraId: {
    type: 'string',
    default: ''
  },
  recordingMode: {
    type: 'string',
    enum: ['camera', 'screen', 'both'],
    default: 'camera'
  },
  openaiApiKey: {
    type: 'string',
    default: ''
  },
  windowBounds: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
      x: { type: 'number' },
      y: { type: 'number' }
    }
  },
  vlogs: {
    type: 'object',
    default: {}
  },
  transcriptionSpeedUp: {
    type: 'boolean',
    default: false
  }
}

export const store = new Store<AppSettings>({
  schema,
  name: 'vlog-settings'
})

// Vlog management functions
export function getVlog(vlogId: string): Vlog | null {
  const vlogs = store.get('vlogs') || {}
  return vlogs[vlogId] || null
}

export function setVlog(vlog: Vlog): void {
  const vlogs = store.get('vlogs') || {}
  vlogs[vlog.id] = vlog
  store.set('vlogs', vlogs)
}

export function updateVlog(vlogId: string, updates: Partial<Vlog>): void {
  const vlogs = store.get('vlogs') || {}
  const existing = vlogs[vlogId] || {}
  vlogs[vlogId] = { ...existing, ...updates }
  store.set('vlogs', vlogs)
}

export function deleteVlog(vlogId: string): void {
  const vlogs = store.get('vlogs') || {}
  delete vlogs[vlogId]
  store.set('vlogs', vlogs)
}

export function getAllVlogs(): Record<string, Vlog> {
  return store.get('vlogs') || {}
}

