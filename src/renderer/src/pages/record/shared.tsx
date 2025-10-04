import { Square } from 'lucide-react'
import { Button } from '../../shared/ui/Button'

interface RecordButtonProps {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export function RecordButton({ isRecording, onStartRecording, onStopRecording }: RecordButtonProps) {
  if (isRecording) {
    return (
      <Button variant="stop" onClick={onStopRecording}>
        <div className="flex items-center justify-center gap-3">
          <Square size={16} />
          Stop Recording
        </div>
      </Button>
    )
  }

  return (
    <Button variant="recording" onClick={onStartRecording}>
      <div className="flex items-center justify-center gap-3">
        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
        Record
      </div>
    </Button>
  )
}

