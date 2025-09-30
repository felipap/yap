import { useRouter } from './shared/Router'
import HomePage from './pages/home'
import RecordingPage from './pages/recording'
import DetailPage from './pages/detail'

export function App() {
  const { currentRoute } = useRouter()

  if (currentRoute.name === 'home') {
    return <HomePage />
  }

  if (currentRoute.name === 'recording') {
    return <RecordingPage />
  }

  if (currentRoute.name === 'detail') {
    return <DetailPage vlogId={currentRoute.vlogId} />
  }

  return <HomePage />
}
