// Ephemeral state that doesn't need to be persisted

interface ConversionState {
  progress: number
}

interface TranscriptionState {
  progress: number
}

// Track active conversions
const activeConversions = new Map<string, ConversionState>()

export function setConversionProgress(logId: string, progress: number): void {
  activeConversions.set(logId, { progress })
}

export function getConversionProgress(logId: string): number | null {
  const state = activeConversions.get(logId)
  return state ? state.progress : null
}

export function removeConversion(logId: string): void {
  activeConversions.delete(logId)
}

export function isConversionActive(logId: string): boolean {
  return activeConversions.has(logId)
}

export function getAllActiveConversions(): Record<string, ConversionState> {
  const result: Record<string, ConversionState> = {}
  activeConversions.forEach((state, logId) => {
    result[logId] = state
  })
  return result
}

// Track active transcriptions
const activeTranscriptions = new Map<string, TranscriptionState>()

export function setTranscriptionProgress(
  logId: string,
  progress: number,
): void {
  activeTranscriptions.set(logId, { progress })
}

export function getTranscriptionProgress(logId: string): number | null {
  const state = activeTranscriptions.get(logId)
  return state ? state.progress : null
}

export function removeTranscription(logId: string): void {
  activeTranscriptions.delete(logId)
}

export function isTranscriptionActive(logId: string): boolean {
  return activeTranscriptions.has(logId)
}

export function getAllActiveTranscriptions(): Record<
  string,
  TranscriptionState
> {
  const result: Record<string, TranscriptionState> = {}
  activeTranscriptions.forEach((state, logId) => {
    result[logId] = state
  })
  return result
}
