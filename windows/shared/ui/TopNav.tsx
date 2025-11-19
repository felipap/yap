import { LibraryIcon, RecordIcon } from '../icons'
import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { useRouter } from '../Router'
import { openSettingsWindow } from '../ipc'

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

export function TopNav({ currentTab }: TopNavProps) {
  const router = useRouter()
  useTabShortcuts()

  return (
    <div className="drag-region">
      <div className="flex flex-row justify-between w-full select-none items-center py-1.5 px-2 bg-one  h-(--nav-height)">
        <div className="flex items-center gap-3 pl-20 justify-between w-full">
          <TabButton
            active={currentTab === 'library'}
            onClick={() => {
              router.navigate({ name: 'library' })
            }}
            className="text-[14px] border dark:border-white/10 hover:text-contrast"
          >
            <LibraryIcon className="w-3 h-3 mr-1" />
            Library
          </TabButton>
          {currentTab !== 'record' && <TabButton
            active={currentTab === 'record'}
            onClick={() => {
              router.navigate({ name: 'record' })
            }}
            className={twMerge(
              'text-[14px] border hover:bg-transparent dark:border-white/10 pr-2 hover:text-red-500 dark:hover:text-red-400',
              currentTab === 'record' && 'text-red-500 dark:text-red-400',
            )}
          >
            Record
                <RecordIcon className="w-4 h-4 ml-1" />
            </TabButton>
          }
        </div>
      </div>
    </div>
  )
}

interface TabButtonProps {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  className?: string
}

function TabButton({
  onClick,
  active = false,
  children,
  className,
}: TabButtonProps) {
  return (
    <button
      className={twMerge(
        'no-drag-region px-3 py-0.5 leading-1 self-stretch text-[13px] tracking-normal font-medium  transition-colors rounded-md hover:bg-two flex items-center gap-1',
        active ? 'text-contrast bg-two border' : 'text-secondary',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
