import LibraryPage from './pages/library'
import RecordPage from './pages/record'
import { useRouter } from './shared/Router'
import { TopNav } from './shared/ui/TopNav'

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
    <div className="flex flex-col h-screen text-[14px]">
      <TopNav currentTab={currentRoute.name} />
      {inner}
    </div>
  )
}
