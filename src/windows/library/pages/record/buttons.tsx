import { twMerge } from 'tailwind-merge'

interface Props {
  isRecording: boolean
  isPaused: boolean
  disabled?: boolean
  onStartRecording: () => void
  onTogglePause: () => void
}

export function RecordButton({
  isRecording,
  isPaused,
  disabled,
  onStartRecording,
  onTogglePause,
}: Props) {
  if (isRecording) {
    if (isPaused) {
      return (
        <button
          onClick={onTogglePause}
          className="relative w-10 h-10 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 hover:scale-110"
        >
          {/* <PlayIcon /> */}
        </button>
      )
    }

    return (
      <button
        onClick={onTogglePause}
        className="relative w-10 h-10 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 hover:scale-110 animate-[recording-breathe_3s_ease-in-out_infinite]"
      >
        <div className="w-3.5 h-3.5 bg-white rounded-sm" />
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
      disabled={disabled}
      className={twMerge(
        'w-12 h-12 p-[2px] rounded-full border-2 border-red-500 flex items-center justify-center transition-all hover:scale-[105%] group',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
      )}
    >
      <div
        className={twMerge(
          'w-full h-full rounded-full bg-red-500 transition',
          !disabled && 'hover:bg-red-600',
        )}
      />
    </button>
  )
}

function PlayIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white"
    >
      <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.5-7.36a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z" />
    </svg>
  )
}

interface PillButtonProps {
  onClick: () => void
  children: React.ReactNode
}

export function PillButton({ onClick, children }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'px-3.5 shadow-md py-1.5 text-[15px] font-medium rounded-full transition-colors',
        // 'text-white bg-black hover:bg-neutral-950'
        'text-black bg-white/80 hover:bg-neutral-100',
      )}
    >
      {children}
    </button>
  )
}
