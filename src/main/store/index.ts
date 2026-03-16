// ~/Library/Application Support/yap-camera/data.json

import { app } from 'electron'
import Store, { Schema } from 'electron-store'
import { State } from '../../shared-types'

export type { State } from '../../shared-types'

const schema: Schema<State> = {
  selectedCameraId: {
    type: 'string',
    default: '',
  },
  selectedMicrophoneId: {
    type: 'string',
    default: '',
  },
  recordingMode: {
    type: 'string',
    enum: ['camera', 'screen', 'both', 'audio'],
    default: 'camera',
  },
  cameraAutoSelect: {
    type: 'boolean',
    default: true,
  },
  microphoneAutoSelect: {
    type: 'boolean',
    default: true,
  },
  enableScreenFlash: {
    type: 'boolean',
    default: true,
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
          lastPosition: { type: 'number' },
          lastPositionTimestamp: { type: 'string' },
          // Cached video duration in seconds. Optional because it depends on a
          // heavy operation on the file, and we want the option to not do it.
          duration: { type: 'number' },
          isFavorited: { type: 'boolean' },
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
  debugMode: {
    type: 'boolean',
    default: false,
  },
  sentryEnabled: {
    type: 'boolean',
    default: true,
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

export {
  appendLog,
  deleteLog,
  generateLogId,
  getAllLogs,
  getLog,
  onLogChange,
  setLog,
  updateLog,
} from './logs'

import { decryptSecret, encryptSecret } from './safe-storage'

export function getGeminiApiKey(): string {
  const stored = store.get('geminiApiKey') || ''
  return decryptSecret(stored)
}

export function setGeminiApiKey(apiKey: string): void {
  store.set('geminiApiKey', encryptSecret(apiKey))
}

export function getOpenaiApiKey(): string {
  const stored = store.get('openaiApiKey') || ''
  return decryptSecret(stored)
}

export function setOpenaiApiKey(apiKey: string): void {
  store.set('openaiApiKey', encryptSecret(apiKey))
}
