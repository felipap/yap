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
  getSkipSilence,
  setSkipSilence,
  getSilenceThreshold,
  setSilenceThreshold,
  getMinSilenceDuration,
  setMinSilenceDuration,
} from './ipc'

interface PlaybackPreferencesContextType {
  // Mute state
  isMuted: boolean
  setMuted: (muted: boolean) => Promise<void>
  toggleMute: () => void

  // Playback speed state
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => Promise<void>

  // Skip silence state
  skipSilence: boolean
  setSkipSilence: (skip: boolean) => Promise<void>
  toggleSkipSilence: () => void

  // Silence detection configuration
  silenceThreshold: number
  setSilenceThreshold: (threshold: number) => Promise<void>
  minSilenceDuration: number
  setMinSilenceDuration: (duration: number) => Promise<void>

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
  const [skipSilenceState, setSkipSilenceState] = useState(false)
  const [silenceThresholdState, setSilenceThresholdState] = useState(0.01)
  const [minSilenceDurationState, setMinSilenceDurationState] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial state
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [
          muteState,
          speedState,
          skipSilenceValue,
          thresholdValue,
          durationValue,
        ] = await Promise.all([
          getGlobalVideoMute(),
          getGlobalPlaybackSpeed(),
          getSkipSilence(),
          getSilenceThreshold(),
          getMinSilenceDuration(),
        ])
        setIsMutedState(muteState)
        setPlaybackSpeedState(speedState)
        setSkipSilenceState(skipSilenceValue)
        setSilenceThresholdState(thresholdValue)
        setMinSilenceDurationState(durationValue)
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

  const setSkipSilenceValue = async (skip: boolean) => {
    try {
      await setSkipSilence(skip)
      setSkipSilenceState(skip)
    } catch (error) {
      console.error('Failed to set skip silence:', error)
    }
  }

  const toggleSkipSilence = () => {
    setSkipSilenceValue(!skipSilenceState)
  }

  const setSilenceThresholdValue = async (threshold: number) => {
    try {
      await setSilenceThreshold(threshold)
      setSilenceThresholdState(threshold)
    } catch (error) {
      console.error('Failed to set silence threshold:', error)
    }
  }

  const setMinSilenceDurationValue = async (duration: number) => {
    try {
      await setMinSilenceDuration(duration)
      setMinSilenceDurationState(duration)
    } catch (error) {
      console.error('Failed to set min silence duration:', error)
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

    // Skip silence state
    skipSilence: skipSilenceState,
    setSkipSilence: setSkipSilenceValue,
    toggleSkipSilence,

    // Silence detection configuration
    silenceThreshold: silenceThresholdState,
    setSilenceThreshold: setSilenceThresholdValue,
    minSilenceDuration: minSilenceDurationState,
    setMinSilenceDuration: setMinSilenceDurationValue,

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
