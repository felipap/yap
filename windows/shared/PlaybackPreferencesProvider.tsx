import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import {
  getGlobalVideoMute,
  setGlobalVideoMute,
  getGlobalPlaybackSpeed,
  setGlobalPlaybackSpeed,
} from '../ipc'

interface PlaybackPreferencesContextType {
  // Mute state
  isMuted: boolean
  setMuted: (muted: boolean) => Promise<void>
  toggleMute: () => void

  // Playback speed state
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => Promise<void>

  // Loading state
  isLoading: boolean
}

const PlaybackPreferencesContext = createContext<
  PlaybackPreferencesContextType | undefined
>(undefined)

interface PlaybackPreferencesProviderProps {
  children: ReactNode
}

export function PlaybackPreferencesProvider({
  children,
}: PlaybackPreferencesProviderProps) {
  const [isMuted, setIsMutedState] = useState(false)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial state
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [muteState, speedState] = await Promise.all([
          getGlobalVideoMute(),
          getGlobalPlaybackSpeed(),
        ])
        setIsMutedState(muteState)
        setPlaybackSpeedState(speedState)
      } catch (error) {
        console.error('Failed to load playback preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const setMuted = async (muted: boolean) => {
    try {
      await setGlobalVideoMute(muted)
      setIsMutedState(muted)
    } catch (error) {
      console.error('Failed to set global video mute:', error)
    }
  }

  const toggleMute = () => {
    setMuted(!isMuted)
  }

  const setPlaybackSpeed = async (speed: number) => {
    try {
      await setGlobalPlaybackSpeed(speed)
      setPlaybackSpeedState(speed)
    } catch (error) {
      console.error('Failed to set global playback speed:', error)
    }
  }

  const value: PlaybackPreferencesContextType = {
    // Mute state
    isMuted,
    setMuted,
    toggleMute,

    // Playback speed state
    playbackSpeed,
    setPlaybackSpeed,

    // Loading state
    isLoading,
  }

  return (
    <PlaybackPreferencesContext.Provider value={value}>
      {children}
    </PlaybackPreferencesContext.Provider>
  )
}

export function usePlaybackPreferences() {
  const context = useContext(PlaybackPreferencesContext)
  if (context === undefined) {
    throw new Error(
      'usePlaybackPreferences must be used within a PlaybackPreferencesProvider',
    )
  }
  return context
}
