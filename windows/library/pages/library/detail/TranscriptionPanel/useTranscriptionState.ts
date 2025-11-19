import { useState, useEffect } from 'react'
import {
  getTranscription,
  transcribeVideo,
  getVlog,
  getTranscriptionState,
} from '../../../../../shared/ipc'
import { TranscriptionResult } from '../../../../types'

interface Args {
  vlogId: string
}

interface Return {
  transcription: TranscriptionResult | null
  isTranscribing: boolean
  transcriptionError: string | null
  hasTranscription: boolean
  progress: number
  progressLabel: string
  transcribe: () => Promise<void>
  clearError: () => void
  refreshTranscription: () => Promise<void>
}

export function useTranscriptionState({ vlogId }: Args): Return {
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  )
  const [hasTranscription, setHasTranscription] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // Load existing transcription
  const loadTranscription = async () => {
    try {
      const existingTranscription = await getTranscription(vlogId)
      if (existingTranscription) {
        setTranscription(existingTranscription)
        setHasTranscription(true)
      } else {
        setTranscription(null)
        setHasTranscription(false)
      }
    } catch (error) {
      console.error('Failed to load transcription:', error)
      setTranscription(null)
      setHasTranscription(false)
    }
  }

  // Check and restore transcription state on mount
  useEffect(() => {
    const checkTranscriptionState = async () => {
      try {
        const state = await getTranscriptionState(vlogId)
        if (state.status === 'transcribing') {
          setIsTranscribing(true)
          setProgress(state.progress ?? 0)

          // Set progress label based on progress range
          if (state.progress && state.progress <= 50) {
            setProgressLabel('Extracting audio...')
          } else if (state.progress) {
            setProgressLabel('Transcribing...')
          } else {
            setProgressLabel('Starting...')
          }
        }
      } catch (error) {
        console.error('Failed to get transcription state:', error)
      }
    }

    checkTranscriptionState()
  }, [vlogId])

  // Load transcription on mount and when vlogId changes
  useEffect(() => {
    loadTranscription()
  }, [vlogId])

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (
      updatedVlogId: string,
      updatedProgress: number,
    ) => {
      if (updatedVlogId === vlogId) {
        setProgress(updatedProgress)

        // Set progress label based on progress range
        if (updatedProgress <= 50) {
          setProgressLabel('Extracting audio...')
        } else {
          setProgressLabel('Transcribing with AI...')
        }

        // Reset state when transcription completes
        if (updatedProgress >= 100) {
          setTimeout(() => {
            setIsTranscribing(false)
            setProgress(0)
            setProgressLabel('')
            loadTranscription() // Reload to get the completed transcription
          }, 500) // Small delay to show 100% before resetting
        }
      }
    }

    // Listen for progress updates from the main process
    if (window.electronAPI.onTranscriptionProgressUpdated) {
      window.electronAPI.onTranscriptionProgressUpdated(handleProgressUpdate)
    }

    return () => {
      if (window.electronAPI.removeTranscriptionProgressListener) {
        window.electronAPI.removeTranscriptionProgressListener(
          handleProgressUpdate,
        )
      }
    }
  }, [vlogId])

  // Transcribe function
  const transcribe = async () => {
    setIsTranscribing(true)
    setTranscriptionError(null)
    setTranscription(null)
    setHasTranscription(false)
    setProgress(0)
    setProgressLabel('Starting...')

    try {
      const result = await transcribeVideo(vlogId)
      setTranscription(result)
      setHasTranscription(true)
      setProgress(100)
      setProgressLabel('Complete!')
    } catch (error) {
      console.error('Transcription failed:', error)
      setTranscriptionError(
        error instanceof Error ? error.message : 'Transcription failed',
      )
    } finally {
      setIsTranscribing(false)
    }
  }

  // Clear error function
  const clearError = () => {
    setTranscriptionError(null)
  }

  // Refresh transcription function
  const refreshTranscription = async () => {
    await loadTranscription()
  }

  return {
    transcription,
    isTranscribing,
    transcriptionError,
    hasTranscription,
    progress,
    progressLabel,
    transcribe,
    clearError,
    refreshTranscription,
  }
}
