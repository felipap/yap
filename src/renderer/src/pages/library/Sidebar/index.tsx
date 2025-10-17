import { useMemo } from 'react'
import { RecordedFile } from '../../../types'
import { useVlogData } from '../../../shared/useVlogData'

function useNamedVlogData() {
  const { vlogs } = useVlogData()

  const groupedVlogs = useMemo(() => {
    const groups = vlogs.reduce(
      (groups, file) => {
        const dateKey = file.created.toDateString()
        if (!groups[dateKey]) {
          groups[dateKey] = []
        }
        groups[dateKey].push(file)
        return groups
      },
      {} as Record<string, RecordedFile[]>,
    )

    // Sort files within each date group by creation time (oldest first)
    Object.keys(groups).forEach((dateKey) => {
      groups[dateKey].sort((a, b) => a.created.getTime() - b.created.getTime())
    })

    return groups
  }, [vlogs.length])

  return { groupedVlogs }
}

interface SidebarProps {
  selectedVlog: RecordedFile | null
  onVideoSelect: (file: RecordedFile) => void
  onClose: () => void
}

export function Sidebar({
  selectedVlog,
  onVideoSelect,
  onClose,
}: SidebarProps) {
  const { groupedVlogs } = useNamedVlogData()

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )

    // If it's within the last 7 days, show day name
    if (diffInDays <= 7) {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
    }

    // Otherwise show "Dec 21, 2023" format
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = Math.floor(duration % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-one bg-two overflow-y-auto">
      <div className="p-2">
        <div className="flex flex-col gap-0">
          {Object.entries(groupedVlogs).map(([dateKey, files]) => (
            <div key={dateKey} className="mb-2">
              {/* Date header */}
              <div className="text-xs font-medium text-gray-500 mb-1 px-3">
                {formatDate(files[0].created)}
              </div>

              {/* Files for this date */}
              <div className="flex flex-col gap-0">
                {files.map((file, index) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      onVideoSelect(file)
                    }}
                    className={`text-left p-3 rounded-lg transition-colors ${
                      selectedVlog?.id === file.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-[var(--bg-tertiary)] text-contrast hover:bg-[var(--color-tertiary)]'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="relative w-16 h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                        {file.thumbnailPath ? (
                          <img
                            src={file.thumbnailPath}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-2xl">🎬</div>
                          </div>
                        )}

                        {file.duration && (
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                            {formatDuration(file.duration)}
                          </div>
                        )}
                      </div>

                      {/* File info with numbering */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {files.length > 1 ? `${index + 1}. ` : ''}
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {file.created.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
