import { useRef, useState } from 'react'
import { getBufferedPercent } from './utils'

interface Props {
  currentTime: number
  duration: number
  bufferedRanges: TimeRanges | null
  onSeek: (time: number) => void
  onSeekStart?: () => void
  onSeekEnd?: () => void
}

export function SeekBar({
  currentTime,
  duration,
  bufferedRanges,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: Props) {
  const seekBarRef = useRef<HTMLDivElement>(null)
  const [localTime, setLocalTime] = useState<number | null>(null)

  const displayTime = localTime ?? currentTime
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0
  const bufferedPercent = getBufferedPercent(bufferedRanges, currentTime, duration)

  const getTimeFromEvent = (clientX: number): number | null => {
    const seekBar = seekBarRef.current
    if (!seekBar || !duration) {
      return null
    }
    const rect = seekBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return percent * duration
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTimeFromEvent(e.clientX)
    if (time !== null) {
      onSeek(time)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTimeFromEvent(e.clientX)
    if (time === null) {
      return
    }

    setLocalTime(time)
    onSeekStart?.()
    onSeek(time)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newTime = getTimeFromEvent(moveEvent.clientX)
      if (newTime !== null) {
        setLocalTime(newTime)
        onSeek(newTime)
      }
    }

    const handleMouseUp = () => {
      setLocalTime(null)
      onSeekEnd?.()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="mb-3">
      <div
        className="relative cursor-pointer py-2 -my-2 group"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={seekBarRef}
          className="relative h-1 bg-white/30 rounded-full pointer-events-none"
        >
          {/* Buffered Progress */}
          <div
            className="absolute h-full bg-white/40 rounded-full pointer-events-none"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played Progress */}
          <div
            className="absolute h-full bg-white rounded-full pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Seek Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              left: `${progressPercent}%`,
              marginLeft: '-6px',
            }}
          />
        </div>
      </div>
    </div>
  )
}
