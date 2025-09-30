import Store, { Schema } from 'electron-store'

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
  }
}

export const store = new Store<AppSettings>({
  schema,
  name: 'vlog-settings'
})

