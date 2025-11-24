// ~/Library/Application Support/yap-camera/data.json

import { createHash } from 'crypto'
import { app } from 'electron'
import Store, { Schema } from 'electron-store'
import { Log, State } from '../../shared-types'

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
  previousWindowBounds: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
      x: { type: 'number' },
      y: { type: 'number' },
    },
  },
  logs: {
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
  userContext: {
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

// Log management functions
export function getLog(logId: string): Log | null {
  const logs = store.get('logs') || {}
  return logs[logId] || null
}

export function appendLog(log: Log): Log {
  const logs = store.get('logs') || {}
  logs[log.id] = log
  store.set('logs', logs)
  return log
}

export function setLog(log: Log): void {
  const logs = store.get('logs') || {}
  logs[log.id] = log
  store.set('logs', logs)
}

export function updateLog(logId: string, updates: Partial<Log>): void {
  const logs = store.get('logs') || {}
  const existing = logs[logId]

  // Only update if the log exists and has all required fields
  // This prevents creating incomplete log entries that violate the schema
  if (
    !existing ||
    !existing.id ||
    !existing.name ||
    !existing.path ||
    !existing.timestamp
  ) {
    console.warn(
      `Cannot update log ${logId}: log does not exist or is missing required fields`,
    )
    return
  }

  logs[logId] = { ...existing, ...updates }
  store.set('logs', logs)
}

export function deleteLog(logId: string): void {
  const logs = store.get('logs') || {}
  delete logs[logId]
  store.set('logs', logs)
}

export function getAllLogs(): Record<string, Log> {
  return store.get('logs') || {}
}
