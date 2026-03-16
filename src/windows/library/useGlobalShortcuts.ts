import { useEffect } from 'react'
import { useRouter } from '../shared/Router'
import {
  openSettingsWindow,
  requestSwitchToLibrary,
} from '../shared/ipc'

export function useGlobalShortcuts() {
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
