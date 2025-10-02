import {
  RecordedFile,
  RecordingMode,
  TranscriptionResult,
  TranscriptionState,
  ImportResult,
} from './types'

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

export async function getVideoDuration(vlogId: string): Promise<number> {
  return window.electronAPI.getVideoDuration(vlogId)
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
