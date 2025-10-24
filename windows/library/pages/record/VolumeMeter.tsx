import { twMerge } from 'tailwind-merge'
import { useVolumeMeter } from './useVolumeMeter'

interface VolumeMeterProps {
  microphoneId?: string
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function VolumeMeter({
  microphoneId,
  className = '',
  showLabel = true,
  size = 'md',
}: VolumeMeterProps) {
  const { volumeData } = useVolumeMeter({ microphoneId })

  const barCount = getBarCount(size)
  const activeBars = Math.ceil(volumeData.volume * barCount)

  const getBarColor = (index: number) => {
    if (index < activeBars) {
      if (volumeData.isMuted) {
        return 'bg-gray-400'
      }
      return 'bg-green-500'
    }
    return 'bg-gray-300 dark:bg-gray-600'
  }

  return (
    <div className={twMerge('flex flex-col gap-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-contrast">
            Microphone Level
          </span>
          {volumeData.isMuted && (
            <span className="text-xs text-gray-500">(Muted)</span>
          )}
          {!volumeData.isActive && (
            <span className="text-xs text-gray-500">(Inactive)</span>
          )}
        </div>
      )}

      <div
        className={twMerge('flex items-end gap-1 w-fit', getSizeClasses(size))}
      >
        {Array.from({ length: barCount }, (_, index) => (
          <div
            key={index}
            className={twMerge(
              'w-[5px] rounded-sm transition-all duration-100',
              getBarColor(index),
            )}
            style={{
              height: '100%',
              opacity: index < activeBars ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  )
}

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'h-[20px]'
    case 'md':
      return 'w-24 h-12'
    case 'lg':
      return 'w-32 h-16'
    default:
      return 'w-24 h-12'
  }
}

const getBarCount = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 4
    case 'md':
      return 6
    case 'lg':
      return 8
    default:
      return 6
  }
}
