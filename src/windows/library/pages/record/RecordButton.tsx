interface Props {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export function RecordButton({
  isRecording,
  onStartRecording,
  onStopRecording,
}: Props) {
  if (isRecording) {
    return (
      <button
        onClick={onStopRecording}
        className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 hover:scale-105"
      >
        <div className="w-3.5 h-3.5 bg-red-900 rounded-sm" />
      </button>
    )
  }

  return (
    <button
      onClick={onStartRecording}
      className="w-14 h-14 p-0.5 rounded-full border-2 border-red-500 flex items-center justify-center transition-all hover:scale-105"
    >
      <div className="w-full h-full rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
    </button>
  )
}
