import { useRouter } from '../shared/Router'
import { TopNav } from '../shared/ui/TopNav'
import LibraryPage from './pages/library'
import RecordPage from './pages/record'

export function App() {
  const { currentRoute } = useRouter()

  let inner = null
  if (currentRoute.name === 'library') {
    inner = <LibraryPage />
  } else if (currentRoute.name === 'record') {
    inner = <RecordPage />
  } else {
    inner = <LibraryPage />
  }

  return (
    <div className="flex flex-col h-screen text-[14px] track-10 bg-two/60">
      <TopNav currentTab={currentRoute.name} />
      <div className="flex-1 overflow-hidden">{inner}</div>
    </div>
  )
}
