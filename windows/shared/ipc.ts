// Expose IPC methods. Prefer to calling window.electronAPI directly?

import {
  EnrichedLog,
  ImportResult,
  RecordingMode,
  ScreenSource,
  SharedIpcMethods,
  State,
  TranscriptionResult,
  TranscriptionState,
} from '../library/types'

declare global {
  interface Window {
    electronAPI: SharedIpcMethods
  }
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  return window.electronAPI.getScreenSources()
}

export async function getEnrichedLogs(): Promise<EnrichedLog[]> {
  return window.electronAPI.getEnrichedLogs()
}

export async function openFileLocation(logId: string): Promise<void> {
  return window.electronAPI.openFileLocation(logId)
}

export async function untrackLog(logId: string): Promise<boolean> {
  return window.electronAPI.untrackLog(logId)
}

export async function saveRecording(
  filename: string,
  buffer: ArrayBuffer,
): Promise<string> {
  return window.electronAPI.saveRecording(filename, buffer)
}

export async function startStreamingRecording(config: any): Promise<string> {
  return window.electronAPI.startStreamingRecording(config)
}

export async function appendRecordingChunk(chunk: ArrayBuffer): Promise<void> {
  return window.electronAPI.appendRecordingChunk(chunk)
}

export async function finalizeStreamingRecording(): Promise<string> {
  return window.electronAPI.finalizeStreamingRecording()
}

// Store functions
export async function getStoredValue<T>(key: string): Promise<T> {
  return window.electronAPI.store.get<T>(key)
}

export async function setStoredValue(key: string, value: any): Promise<void> {
  return window.electronAPI.store.set(key, value)
}

// Convenience functions for specific settings
export async function getSelectedCameraId(): Promise<string | undefined> {
  return getStoredValue<string>('selectedCameraId')
}

export async function setSelectedCameraId(cameraId: string): Promise<void> {
  return setStoredValue('selectedCameraId', cameraId)
}

export async function getRecordingMode(): Promise<RecordingMode | undefined> {
  return getStoredValue<RecordingMode>('recordingMode')
}

export async function setRecordingMode(mode: RecordingMode): Promise<void> {
  return setStoredValue('recordingMode', mode)
}

export async function getSelectedMicrophoneId(): Promise<string | undefined> {
  return getStoredValue<string>('selectedMicrophoneId')
}

export async function setSelectedMicrophoneId(
  microphoneId: string,
): Promise<void> {
  return setStoredValue('selectedMicrophoneId', microphoneId)
}

export async function getGlobalVideoMute(): Promise<boolean> {
  return getStoredValue<boolean>('globalVideoMute') || false
}

export async function setGlobalVideoMute(muted: boolean): Promise<void> {
  return setStoredValue('globalVideoMute', muted)
}

export async function getGlobalPlaybackSpeed(): Promise<number> {
  return getStoredValue<number>('globalPlaybackSpeed') || 1.0
}

export async function setGlobalPlaybackSpeed(speed: number): Promise<void> {
  return setStoredValue('globalPlaybackSpeed', speed)
}

// Transcription functions
export async function transcribeVideo(
  logId: string,
): Promise<TranscriptionResult> {
  return window.electronAPI.transcribeVideo(logId)
}

export async function getTranscription(
  logId: string,
): Promise<TranscriptionResult | null> {
  return window.electronAPI.getTranscription(logId)
}

export async function getTranscriptionState(
  logId: string,
): Promise<TranscriptionState> {
  return window.electronAPI.getTranscriptionState(logId)
}

// Summary functions
export async function generateVideoSummary(
  logId: string,
  transcription: string,
): Promise<string> {
  return window.electronAPI.generateVideoSummary(logId, transcription)
}

// Import functions
export async function importVideoFile(filePath: string): Promise<ImportResult> {
  return window.electronAPI.importVideoFile(filePath)
}

// Video position functions
export async function saveVideoPosition(
  logId: string,
  position: number,
): Promise<boolean> {
  return window.electronAPI.saveVideoPosition(logId, position)
}

export async function getVideoPosition(
  logId: string,
): Promise<{ position: number; timestamp: string } | null> {
  return window.electronAPI.getVideoPosition(logId)
}

export async function onViewLogEntry(logId: string): Promise<void> {
  return window.electronAPI.onViewLogEntry(logId)
}

export async function getLog(logId: string): Promise<EnrichedLog> {
  return window.electronAPI.getEnrichedLog(logId)
}

export async function setLogTitle(
  logId: string,
  title: string,
): Promise<boolean> {
  return window.electronAPI.updateLog(logId, { title })
}

// General log events
export function onLogUpdated(callback: (logId: string) => void) {
  if (window.electronAPI.onLogUpdated) {
    window.electronAPI.onLogUpdated(callback)
  }
}

export function onStateChange(callback: (state: State) => void) {
  if (window.electronAPI.onStateChange) {
    window.electronAPI.onStateChange(callback)
  }
}

export function removeLogUpdatedListener() {
  if (window.electronAPI.removeLogUpdatedListener) {
    window.electronAPI.removeLogUpdatedListener()
  }
}

// Settings functions
export async function openSettingsWindow(): Promise<{
  success: boolean
  windowId: number
}> {
  return window.electronAPI.openSettingsWindow()
}

export async function hideSettingsWindow(): Promise<void> {
  return window.electronAPI.hideSettingsWindow()
}

export async function getGeminiApiKey(): Promise<string> {
  return window.electronAPI.getGeminiApiKey()
}

export async function setGeminiApiKey(apiKey: string): Promise<boolean> {
  return window.electronAPI.setGeminiApiKey(apiKey)
}

export async function getRecordingsFolder(): Promise<string> {
  return window.electronAPI.getRecordingsFolder()
}

export async function setRecordingsFolder(folderPath: string): Promise<void> {
  return window.electronAPI.setPartialState({ recordingsFolder: folderPath })
}

export async function openFolderPicker(): Promise<string | null> {
  return window.electronAPI.openFolderPicker()
}

// MP4 conversion
export async function convertToMp4(logId: string): Promise<{
  success: boolean
  message: string
  newLogId: string
  outputPath: string
}> {
  return window.electronAPI.convertToMp4(logId)
}

export async function getConversionState(logId: string): Promise<{
  isActive: boolean
  progress: number | null
}> {
  return window.electronAPI.getConversionState(logId)
}

export async function moveToDefaultFolder(logId: string): Promise<{
  success: boolean
  message: string
  newPath?: string
}> {
  return window.electronAPI.moveToDefaultFolder(logId)
}

export async function onChangeTopLevelPage(
  page: 'library' | 'record',
): Promise<void> {
  return window.electronAPI.onChangeTopLevelPage(page)
}
