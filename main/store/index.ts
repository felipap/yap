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

import { decryptSecret, encryptSecret } from './safe-storage'
export { decryptSecret, encryptSecret } from './safe-storage'
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

export function getGeminiApiKey(): string {
  return decryptSecret(store.get('geminiApiKey') || '')
}

export function setGeminiApiKey(apiKey: string): void {
  store.set('geminiApiKey', encryptSecret(apiKey))
}

export function getOpenaiApiKey(): string {
  return decryptSecret(store.get('openaiApiKey') || '')
}

export function setOpenaiApiKey(apiKey: string): void {
  store.set('openaiApiKey', encryptSecret(apiKey))
}
