import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { useRouter } from '../Router'
import { LibraryIcon, RecordIcon } from '../icons'
import { openSettingsWindow, requestSwitchToLibrary } from '../ipc'

interface Props {
  currentTab: 'library' | 'record'
}

export function TopNav({ currentTab }: Props) {
  const router = useRouter()
  useTabShortcuts()

  const handleLibraryClick = async () => {
    const result = await requestSwitchToLibrary()
    if (!result.allowed) {
      return
    }
    if (!result.wasRecording) {
      router.navigate({ name: 'library' })
    }
  }

  const handleRecordClick = () => {
    router.navigate({ name: 'record' })
  }

  return (
    <div className="drag-region">
      <div className="flex flex-row justify-end w-full select-none items-center py-1.5 px-2 bg-one h-(--nav-height)">
        <div className="flex items-center bg-stone-200 dark:bg-stone-700 rounded-full p-0.5">
            <PillTab
              active={currentTab === 'library'}
              onClick={handleLibraryClick}
            >
              <LibraryIcon className="w-3 h-3" />
              Library
            </PillTab>

            <PillTab
              active={currentTab === 'record'}
              onClick={handleRecordClick}
            >
              <RecordIcon className="w-3 h-3" />
              Record
            </PillTab>
        </div>
      </div>
    </div>
  )
}

interface PillTabProps {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}

function PillTab({ onClick, active = false, children }: PillTabProps) {
  return (
    <button
      className={twMerge(
        'no-drag-region px-2.5 py-1 text-[11px] font-medium transition-all rounded-full flex items-center gap-1',
        active
          ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 shadow-sm'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function useTabShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'L') {
        e.preventDefault()
        const result = await requestSwitchToLibrary()
        if (!result.allowed) {
          return
        }
        if (!result.wasRecording) {
          router.navigate({ name: 'library' })
        }
      } else if (e.metaKey && e.key === 'R') {
        e.preventDefault()
        router.navigate({ name: 'record' })
      } else if (e.metaKey && e.key === ',') {
        e.preventDefault()
        openSettingsWindow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [router])
}
