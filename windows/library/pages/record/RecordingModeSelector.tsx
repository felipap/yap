import { Button } from '../../../shared/ui/Button'
import { RecordingMode } from '../../types'

interface RecordingModeSelectorProps {
  recordingMode: RecordingMode
  onModeChange: (mode: RecordingMode) => void
  isRecording: boolean
}

export function RecordingModeSelector({
  recordingMode,
  onModeChange,
  isRecording,
}: RecordingModeSelectorProps) {
  // Hidden for now - recording mode is always camera
  return null
}
