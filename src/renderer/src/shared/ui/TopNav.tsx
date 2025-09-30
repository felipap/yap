import { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { useRouter } from '../Router'

interface TopNavProps {
  currentTab: 'library' | 'record'
}

function useTabShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '1') {
        e.preventDefault()
        router.navigate({ name: 'library' })
      } else if (e.metaKey && e.key === '2') {
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
      <div className="no-drag-region w-fit select-none flex items-center gap-3 py-1.5 bg-four pl-20 border-b">
        <TabButton
          active={currentTab === 'library'}
          onClick={() => {
            router.navigate({ name: 'library' })
          }}
        >
          📚 Library
        </TabButton>
        <TabButton
          active={currentTab === 'record'}
          onClick={() => {
            router.navigate({ name: 'record' })
          }}
        >
          🎥 Record
        </TabButton>
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
        'px-3 h-7 text-sm font-medium transition-colors  rounded-md hover:bg-two',
        active ? 'text-contrast bg-two' : 'text-secondary',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
