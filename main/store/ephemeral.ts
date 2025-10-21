// Ephemeral state that doesn't need to be persisted

interface ConversionState {
  progress: number
}

interface TranscriptionState {
  progress: number
}

// Track active conversions
const activeConversions = new Map<string, ConversionState>()

export function setConversionProgress(vlogId: string, progress: number): void {
  activeConversions.set(vlogId, { progress })
}

export function getConversionProgress(vlogId: string): number | null {
  const state = activeConversions.get(vlogId)
  return state ? state.progress : null
}

export function removeConversion(vlogId: string): void {
  activeConversions.delete(vlogId)
}

export function isConversionActive(vlogId: string): boolean {
  return activeConversions.has(vlogId)
}

export function getAllActiveConversions(): Record<string, ConversionState> {
  const result: Record<string, ConversionState> = {}
  activeConversions.forEach((state, vlogId) => {
    result[vlogId] = state
  })
  return result
}

// Track active transcriptions
const activeTranscriptions = new Map<string, TranscriptionState>()

export function setTranscriptionProgress(
  vlogId: string,
  progress: number,
): void {
  activeTranscriptions.set(vlogId, { progress })
}

export function getTranscriptionProgress(vlogId: string): number | null {
  const state = activeTranscriptions.get(vlogId)
  return state ? state.progress : null
}

export function removeTranscription(vlogId: string): void {
  activeTranscriptions.delete(vlogId)
}

export function isTranscriptionActive(vlogId: string): boolean {
  return activeTranscriptions.has(vlogId)
}

export function getAllActiveTranscriptions(): Record<
  string,
  TranscriptionState
> {
  const result: Record<string, TranscriptionState> = {}
  activeTranscriptions.forEach((state, vlogId) => {
    result[vlogId] = state
  })
  return result
}
