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
        className="relative w-10 h-10 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 hover:scale-110 animate-[recording-breathe_3s_ease-in-out_infinite]"
      >
        <div className="relative z-10 w-3.5 h-3.5 bg-red-900 rounded-sm" />
        <style>{`
          @keyframes recording-breathe {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.08);
            }
          }
        `}</style>
      </button>
    )
  }

  return (
    <button
      onClick={onStartRecording}
      className="w-12 h-12 p-1 rounded-full border-2 border-red-500 flex items-center justify-center transition-all hover:scale-105 group"
    >
      <div className="w-full AAgroup-hover:scale-[98%] h-full rounded-full bg-red-500 hover:bg-red-600 transition" />
    </button>
  )
}
