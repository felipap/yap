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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <Button onClick={() => onModeChange('camera')}>Camera</Button>
        <Button onClick={() => onModeChange('screen')}>Screen</Button>
        <Button onClick={() => onModeChange('both')}>Both</Button>
      </div>
    </div>
  )
}
