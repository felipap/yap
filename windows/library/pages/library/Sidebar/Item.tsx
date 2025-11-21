import { MdLinkOff, MdMic, MdMovie } from 'react-icons/md'
import { twMerge } from 'tailwind-merge'
import { SidebarItem } from '.'
import { IS_DEV } from '../../..'
import { formatDate, formatDateOrRelative } from './formatters'

interface Props {
  data: SidebarItem
  selected: boolean
  onClick: () => void
}

export function Item({ data, selected, onClick }: Props) {
  const isMissing = !data.fileExists

  return (
    <button
      onClick={onClick}
      className={twMerge(
        `text-left pl-2 py-1.5 transition-colors select-none`,
        'hover:bg-one hover:dark:bg-one rounded-md',
        selected
          ? '!bg-blue-500 dark:!bg-[#2A2A2A] hover:dark:!bg-[#1F1F1F] text-white'
          : 'text-contrast',
        isMissing && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Thumbnail */}
        <div className="relative x2 w-[70px] h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
          <ItemImage data={data} isMissing={isMissing} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-md truncate flex items-center gap-1 pr-4">
              <span className="truncate">{data.displayTitle}</span>
              {!data.title && data.dayIndex && (
                <span className="opacity-30 tracking-wider ml-0">
                  #{data.dayIndex}
                </span>
              )}
              {IS_DEV && !data.transcription && (
                <span
                  className="text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-500 dark:text-yellow-400"
                  title="No transcription"
                >
                  No transcript
                </span>
              )}
            </div>
            {data.title && (
              <div className="text-xs opacity-50 truncate flex items-center gap-1">
                <span className="truncate">
                  {formatDateOrRelative(data.created)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

const formatDuration = (duration: number) => {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = Math.floor(duration % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

function ItemImage({
  data,
  isMissing,
}: {
  data: SidebarItem
  isMissing: boolean
}) {
  return (
    <>
      {data.thumbnailPath && !isMissing ? (
        <img
          src={data.thumbnailPath}
          alt={(data.title || formatDate(data.created) || data.name) as string}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide the broken image and show fallback
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement
            if (fallback) {
              fallback.style.display = 'flex'
            }
          }}
        />
      ) : null}

      {/* Fallback when no thumbnail or thumbnail fails to load */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ display: data.thumbnailPath && !isMissing ? 'none' : 'flex' }}
      >
        {isMissing ? (
          <MdLinkOff size={24} className="text-gray-400" />
        ) : data.isAudioOnly ? (
          <MdMic size={24} className="text-gray-400" />
        ) : (
          <MdMovie size={24} className="text-gray-400" />
        )}
      </div>

      {data.duration && !isMissing && (
        <div className="absolute bottom-0.5 right-0.5 bg-black/80 bg-opacity-80 text-white text-[11px] px-1 py-0.5 rounded">
          {formatDuration(data.duration)}
        </div>
      )}
    </>
  )
}
