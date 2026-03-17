import { setupLogHandlers } from './logs'
import { setupRecordingHandlers } from './recording'
import { setupSettingsHandlers } from './settings'
import { setupStoreHandlers } from './store'
import { setupTranscriptionHandlers } from './transcription'
import { setupVideoHandlers } from './video'

export { enrichLog } from './logs'

export function setupIpcHandlers() {
  setupStoreHandlers()
  setupRecordingHandlers()
  setupLogHandlers()
  setupTranscriptionHandlers()
  setupVideoHandlers()
  setupSettingsHandlers()
}
