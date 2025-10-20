import {
  RecordedFile,
  RecordingMode,
  TranscriptionResult,
  TranscriptionState,
  ImportResult,
} from '../main/types'

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  return window.electronAPI.getScreenSources()
}

export async function getRecordedFiles(): Promise<RecordedFile[]> {
  return window.electronAPI.getRecordedFiles()
}

export async function openFileLocation(vlogId: string): Promise<void> {
  return window.electronAPI.openFileLocation(vlogId)
}

export async function untrackVlog(vlogId: string): Promise<boolean> {
  return window.electronAPI.untrackVlog(vlogId)
}

export async function saveRecording(
  filename: string,
  buffer: ArrayBuffer,
): Promise<string> {
  return window.electronAPI.saveRecording(filename, buffer)
}

// Store functions
export async function getStoredValue<T>(key: string): Promise<T> {
  return window.electronAPI.store.get<T>(key)
}

export async function setStoredValue(key: string, value: any): Promise<void> {
  return window.electronAPI.store.set(key, value)
}

export async function getAllStoredValues(): Promise<Record<string, any>> {
  return window.electronAPI.store.getAll()
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
  vlogId: string,
): Promise<TranscriptionResult> {
  return window.electronAPI.transcribeVideo(vlogId)
}

export async function getTranscription(
  vlogId: string,
): Promise<TranscriptionResult | null> {
  return window.electronAPI.getTranscription(vlogId)
}

export async function loadVideoDuration(vlogId: string): Promise<number> {
  return window.electronAPI.loadVideoDuration(vlogId)
}

export async function getTranscriptionState(
  vlogId: string,
): Promise<TranscriptionState> {
  return window.electronAPI.getTranscriptionState(vlogId)
}

export async function getAllTranscriptionStates(): Promise<
  Record<string, TranscriptionState>
> {
  return window.electronAPI.getAllTranscriptionStates()
}

// Summary functions
export async function generateVideoSummary(
  vlogId: string,
  transcription: string,
): Promise<string> {
  return window.electronAPI.generateVideoSummary(vlogId, transcription)
}

export async function saveVideoSummary(
  vlogId: string,
  summary: string,
): Promise<void> {
  return window.electronAPI.saveVideoSummary(vlogId, summary)
}

// Import functions
export async function importVideoFile(filePath: string): Promise<ImportResult> {
  return window.electronAPI.importVideoFile(filePath)
}

// Video position functions
export async function saveVideoPosition(
  vlogId: string,
  position: number,
): Promise<boolean> {
  return window.electronAPI.saveVideoPosition(vlogId, position)
}

export async function getVideoPosition(
  vlogId: string,
): Promise<{ position: number; timestamp: string } | null> {
  return window.electronAPI.getVideoPosition(vlogId)
}

export async function getVlog(vlogId: string): Promise<any> {
  return window.electronAPI.getVlog(vlogId)
}

export async function setVlogTitle(
  vlogId: string,
  title: string,
): Promise<boolean> {
  return window.electronAPI.updateVlog(vlogId, { title })
}

// General vlog events
export function onVlogUpdated(callback: (vlogId: string) => void) {
  if (window.electronAPI.onVlogUpdated) {
    window.electronAPI.onVlogUpdated(callback)
  }
}

export function onStateChange(callback: () => void) {
  if (window.electronAPI.onStateChange) {
    window.electronAPI.onStateChange(callback)
  }
}

export function removeVlogUpdatedListener() {
  if (window.electronAPI.removeVlogUpdatedListener) {
    window.electronAPI.removeVlogUpdatedListener()
  }
}

// Settings functions
export async function openSettingsWindow(): Promise<{
  success: boolean
  windowId: number
}> {
  return window.electronAPI.openSettingsWindow()
}

export async function getGeminiApiKey(): Promise<string> {
  return window.electronAPI.getGeminiApiKey()
}

export async function setGeminiApiKey(apiKey: string): Promise<boolean> {
  return window.electronAPI.setGeminiApiKey(apiKey)
}

// MP4 conversion
export async function convertToMp4(vlogId: string): Promise<{
  success: boolean
  message: string
  newVlogId: string
  outputPath: string
}> {
  return window.electronAPI.convertToMp4(vlogId)
}
