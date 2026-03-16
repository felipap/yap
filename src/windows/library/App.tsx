import { useEffect } from 'react'
import { useRouter } from '../shared/Router'
import {
  onChangeTopLevelPage,
  openSettingsWindow,
  requestSwitchToLibrary,
} from '../shared/ipc'
import LibraryPage from './pages/library'
import { RecordPage } from './pages/record'

export function App() {
  const { currentRoute } = useRouter()
  useGlobalShortcuts()

  useEffect(() => {
    if (currentRoute.name === 'record') {
      onChangeTopLevelPage('record')
    } else {
      onChangeTopLevelPage('library')
    }
  }, [currentRoute.name])

  if (currentRoute.name === 'record') {
    return (
      <div className="flex flex-col h-screen text-[14px] track-10 dark:antialiased">
        <RecordPage />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen text-[14px] track-10 dark:antialiased">
      <div className="drag-region h-(--nav-height) bg-one" />
      <div className="flex-1 overflow-hidden">
        <LibraryPage />
      </div>
    </div>
  )
}

function useGlobalShortcuts() {
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
