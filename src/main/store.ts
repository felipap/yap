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

export interface AppSettings {
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

const schema: Schema<AppSettings> = {
  selectedCameraId: {
    type: 'string',
    default: '',
  },
  recordingMode: {
    type: 'string',
    enum: ['camera', 'screen', 'both'],
    default: 'camera',
  },
  globalVideoMute: {
    type: 'boolean',
    default: false,
  },
  globalPlaybackSpeed: {
    type: 'number',
    default: 1.0,
  },
  openaiApiKey: {
    type: 'string',
  },
  geminiApiKey: {
    type: 'string',
  },
  windowBounds: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
      x: { type: 'number' },
      y: { type: 'number' },
    },
  },
  vlogs: {
    type: 'object',
    default: {},
    patternProperties: {
      '^[a-f0-9]{16}$': {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          path: { type: 'string' },
          timestamp: { type: 'string' },
          title: { type: 'string' },
          transcription: { type: 'object' },
          summary: { type: 'string' },
          lastPosition: { type: 'number' },
          lastPositionTimestamp: { type: 'string' },
          // Cached video duration in seconds. Optional because it depends on a
          // heavy operation on the file, and we want the option to not do it.
          duration: { type: 'number' },
        },
        required: ['id', 'name', 'path', 'timestamp'],
      },
    },
  },
  transcriptionSpeedUp: {
    type: 'boolean',
    default: false,
  },
}

export const store = new Store<AppSettings>({
  schema,
  name: 'vlog-settings',
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
