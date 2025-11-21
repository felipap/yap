import { Button } from '../../shared/ui/Button'
import { SolidSquare } from '../../shared/icons'

interface Props {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export const RecordButton = ({
  isRecording,
  onStartRecording,
  onStopRecording,
}: Props) => {
  if (isRecording) {
    return (
      <Button variant="stop" onClick={onStopRecording}>
        <div className="flex items-center w-full justify-center gap-3">
          <SolidSquare size={16} />
          Stop Recording
        </div>
      </Button>
    )
  }

  return (
    <Button
      className="w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-102"
      onClick={onStartRecording}
    >
      <div className="flex items-center w-full justify-center gap-3">
        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
        Record
      </div>
    </Button>
  )
}
