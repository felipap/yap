import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { useRouter } from '../Router'
import { Library, Video, Volume2, VolumeX } from 'lucide-react'
import { usePlaybackPreferences } from '../PlaybackPreferencesProvider'

interface TopNavProps {
  currentTab: 'library' | 'record'
}

function useTabShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'L') {
        e.preventDefault()
        router.navigate({ name: 'library' })
      } else if (e.metaKey && e.key === 'R') {
        e.preventDefault()
        router.navigate({ name: 'record' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [router])
}

export function TopNav({ currentTab }: TopNavProps) {
  const router = useRouter()
  useTabShortcuts()

  return (
    <div className="drag-region">
      <div className="flex flex-row justify-between w-full select-none items-center py-1.5 px-2 bg-three border-b">
        <div className="flex items-center gap-3 pl-20">
          <TabButton
            active={currentTab === 'library'}
            onClick={() => {
              router.navigate({ name: 'library' })
            }}
          >
            <Library className="w-4 h-4" />
            Library
          </TabButton>
          <TabButton
            active={currentTab === 'record'}
            onClick={() => {
              router.navigate({ name: 'record' })
            }}
          >
            <Video className="w-4 h-4" />
            Record
          </TabButton>
        </div>
      </div>
    </div>
  )
}

interface TabButtonProps {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}

function TabButton({ onClick, active = false, children }: TabButtonProps) {
  return (
    <button
      className={twMerge(
        'no-drag-region px-3 h-7 text-sm font-medium transition-colors rounded-md hover:bg-two flex items-center gap-2',
        active ? 'text-contrast bg-two' : 'text-secondary',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
