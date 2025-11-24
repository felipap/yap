import { useEffect } from 'react'
import { useRouter } from '../shared/Router'
import { onChangeTopLevelPage } from '../shared/ipc'
import { TopNav } from '../shared/ui/TopNav'
import LibraryPage from './pages/library'
import RecordPage from './pages/record'

export function App() {
  const { currentRoute } = useRouter()

  useEffect(() => {
    if (currentRoute.name === 'record') {
      onChangeTopLevelPage('record')
    } else {
      onChangeTopLevelPage('library')
    }
  }, [currentRoute.name])

  let inner = null
  if (currentRoute.name === 'library') {
    inner = <LibraryPage />
  } else if (currentRoute.name === 'record') {
    inner = <RecordPage />
  } else {
    inner = <LibraryPage />
  }

  return (
    <div className="flex flex-col h-screen text-[14px] track-10 dark:antialiased">
      <TopNav currentTab={currentRoute.name} />
      <div className="flex-1 overflow-hidden">{inner}</div>
    </div>
  )
}
