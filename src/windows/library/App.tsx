import { useEffect } from 'react'
import { useRouter } from '../shared/Router'
import { onChangeTopLevelPage } from '../shared/ipc'
import LibraryPage from './pages/library'
import { RecordPage } from './pages/record'
import { useGlobalShortcuts } from './useGlobalShortcuts'

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

  let inner
  if (currentRoute.name === 'record') {
    inner = <RecordPage />
  } else {
    inner = <LibraryPage />
  }

  return (
    <div className="flex flex-col h-screen text-[14px] track-10 dark:antialiased">
      {inner}
    </div>
  )
}
