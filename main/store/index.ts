// ~/Library/Application Support/yap-camera/data.json

import Store, { Schema } from 'electron-store'
import { State, Log } from '../../shared-types'
import { app } from 'electron'
import { createHash } from 'crypto'

export type { State } from '../../shared-types'

const schema: Schema<State> = {
  selectedCameraId: {
    type: 'string',
    default: '',
  },
  recordingMode: {
    type: 'string',
    enum: ['camera', 'screen', 'both', 'audio'],
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
  wasLastFocused: {
    type: 'boolean',
    default: false,
  },
  recordingsFolder: {
    type: 'string',
  },
}

app.setName('yap-camera')

export const store = new Store<State>({
  schema,
  name: 'data',
  clearInvalidConfig: true,
  // watch: true,
  // cwd: '~/Library/Application Support/Yap',
})

console.debug('Store intialized from file:', store.path)

// Helper function to generate a unique ID for a log
export function generateLogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

// Vlog management functions
export function getLog(vlogId: string): Log | null {
  const vlogs = store.get('vlogs') || {}
  return vlogs[vlogId] || null
}

export function setVlog(vlog: Log): void {
  const vlogs = store.get('vlogs') || {}
  vlogs[vlog.id] = vlog
  store.set('vlogs', vlogs)
}

export function updateVlog(vlogId: string, updates: Partial<Log>): void {
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

export function getAllVlogs(): Record<string, Log> {
  return store.get('vlogs') || {}
}
