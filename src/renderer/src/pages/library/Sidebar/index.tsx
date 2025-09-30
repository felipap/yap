import { RecordedFile } from '../../../types'
import { useVlogData } from '../../../shared/useVlogData'

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
  const { vlogs } = useVlogData()

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
  return (
    <div className="w-64 flex-shrink-0 border-r border-one bg-two overflow-y-auto">
      <div className="p-2">
        <div className="flex flex-col gap-0">
          {vlogs.map((file) => (
            <button
              key={file.id}
              onClick={() => {
                onVideoSelect(file)
              }}
              className={`text-left p-3 rounded-lg transition-colors ${
                selectedVlog?.id === file.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--color-tertiary)]'
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
                </div>

                {/* Date */}
                <div className="font-medium text-sm truncate flex items-center">
                  {formatDate(file.created)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
