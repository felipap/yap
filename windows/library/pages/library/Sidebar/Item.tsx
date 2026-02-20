import { memo, useCallback, useState } from 'react'
import { MdMic, MdMovie } from 'react-icons/md'
import { twMerge } from 'tailwind-merge'
import { formatDate, formatDateOrRelative } from './formatters'
import { SidebarItem } from './useIndexedLogData'

interface Props {
  data: SidebarItem
  selected: boolean
  onSelect: (item: SidebarItem) => void
}

export const Item = memo(function Item({ data, selected, onSelect }: Props) {
  const handleClick = useCallback(() => {
    onSelect(data)
  }, [onSelect, data])

  return (
    <button
      onClick={handleClick}
      className={twMerge(
        `w-full text-left pl-2 py-1.5 transition-colors select-none`,
        'hover:bg-one hover:dark:bg-one rounded-md',
        'focus-visible:outline-black dark:focus-visible:outline-white',
        selected
          ? 'bg-blue-500! dark:bg-[#2A2A2A]! hover:dark:bg-[#1F1F1F]! text-white'
          : 'text-contrast',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative x2 w-[70px] h-12 bg-gray-900 rounded overflow-hidden shrink-0">
          <ItemImage data={data} />
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
})

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

function ItemImage({ data }: { data: SidebarItem }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const showImage = !!data.thumbnailPath && !errored

  return (
    <>
      {showImage && (
        <img
          src={data.thumbnailPath!}
          alt={(data.title || formatDate(data.created) || data.name) as string}
          className={twMerge(
            'absolute inset-0 w-full h-full object-cover',
            !loaded && 'invisible',
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {(!showImage || !loaded) && (
        <div className="w-full h-full flex items-center justify-center">
          {data.isAudioOnly ? (
            <MdMic size={24} className="text-gray-400" />
          ) : (
            <MdMovie size={24} className="text-gray-400" />
          )}
        </div>
      )}

      {data.duration && (
        <div className="absolute bottom-0.5 right-0.5 bg-black/80 bg-opacity-80 text-white text-[11px] px-1 py-0.5 rounded">
          {formatDuration(data.duration)}
        </div>
      )}
    </>
  )
}
