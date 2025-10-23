import { join } from 'path'
import { homedir } from 'os'

// Application paths
export const PATHS = {
  // User data directory
  USER_DATA: join(homedir(), '.yap'),

  // Recording directories
  RECORDINGS: join(homedir(), 'Documents', 'VlogRecordings'),
  TEMP: join(homedir(), '.yap', 'temp'),

  // Cache directory
  CACHE: join(homedir(), '.yap', 'cache'),

  // Logs directory
  LOGS: join(homedir(), '.yap', 'logs'),
} as const

// Recording configuration
export const RECORDING_CONFIG = {
  // Auto-save interval in milliseconds
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds

  // Recording quality settings
  VIDEO_BITRATE: 5000000, // 5 Mbps
  MIME_TYPE: 'video/webm;codecs=vp9',
  FALLBACK_MIME_TYPE: 'video/webm;codecs=vp8',

  // Video constraints
  VIDEO_CONSTRAINTS: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    minWidth: 1280,
    maxWidth: 1920,
    minHeight: 720,
    maxHeight: 1080,
  },

  // Recording chunk settings
  CHUNK_INTERVAL: 100, // milliseconds
} as const

// File naming patterns
export const FILE_PATTERNS = {
  RECORDING_CHUNK: (recordingId: string, timestamp: number) =>
    `${recordingId}-chunk-${timestamp}.webm`,

  RECORDING_FILE: (timestamp: string) => `vlog-${timestamp}.webm`,

  RECOVERED_FILE: (recordingId: string, timestamp: string) =>
    `recovered-${recordingId}-${timestamp}.webm`,
} as const

// Helper functions
export function getTempDir(): string {
  return PATHS.TEMP
}

export function getRecordingsDir(): string {
  return PATHS.RECORDINGS
}

export function getUserDataDir(): string {
  return PATHS.USER_DATA
}

export function getCacheDir(): string {
  return PATHS.CACHE
}

export function getLogsDir(): string {
  return PATHS.LOGS
}
