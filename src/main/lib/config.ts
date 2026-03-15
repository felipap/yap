import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'

// Enable debug logging automatically for packaged (production) builds.
// This ensures end-user installs always have detailed logs available.
export const DEBUG = app.isPackaged

// Default recording path
const DEFAULT_RECORDINGS_PATH = join(homedir(), 'Documents', 'YapRecordings')

// Application paths
export const PATHS = {
  // User data directory
  USER_DATA: join(homedir(), '.yap'),

  // Recording directories
  RECORDINGS: DEFAULT_RECORDINGS_PATH,
  TEMP: join(homedir(), '.yap', 'temp'),

  // Cache directory
  CACHE: join(homedir(), '.yap', 'cache'),
} as const

// Recording configuration
export const RECORDING_CONFIG = {
  // Auto-save interval in milliseconds
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds

  // Recording quality settings
  VIDEO_BITRATE: 5000000, // 5 Mbps
  MIME_TYPE: 'video/webm;codecs=vp9',
  FALLBACK_MIME_TYPE: 'video/webm;codecs=vp8',

  // Recording chunk settings
  CHUNK_INTERVAL: 100, // milliseconds
} as const

// File naming patterns
export const FILE_PATTERNS = {
  RECORDING_CHUNK: (recordingId: string, timestamp: number) =>
    `${recordingId}-chunk-${timestamp}.webm`,

  RECORDING_FILE: (timestamp: string) => `log-${timestamp}.webm`,

  RECOVERED_FILE: (recordingId: string, timestamp: string) =>
    `recovered-${recordingId}-${timestamp}.webm`,
} as const

// Helper functions
export function getTempDir(): string {
  return PATHS.TEMP
}

export function getRecordingsDir(customPath?: string): string {
  return customPath || PATHS.RECORDINGS
}

export function getDefaultRecordingsDir(): string {
  return DEFAULT_RECORDINGS_PATH
}

export function getUserDataDir(): string {
  return PATHS.USER_DATA
}

export function getCacheDir(): string {
  return PATHS.CACHE
}
