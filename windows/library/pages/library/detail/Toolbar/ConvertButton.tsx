import { useState, useEffect } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { convertToMp4, getConversionState } from '../../../../../shared/ipc'
import { useVlog } from '../../../../../shared/useVlogData'
import { Button } from '../../../../../shared/ui/Button'

interface ConvertButtonProps {
  vlogId: string
  disabled?: boolean
}

export function ConvertButton({ vlogId, disabled }: ConvertButtonProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const { vlog } = useVlog(vlogId)

  // Check and restore conversion state on mount
  useEffect(() => {
    const checkConversionState = async () => {
      try {
        const state = await getConversionState(vlogId)
        if (state.isActive) {
          setIsConverting(true)
          setProgress(state.progress ?? 0)
        }
      } catch (error) {
        console.error('Failed to get conversion state:', error)
      }
    }

    checkConversionState()
  }, [vlogId])

  useEffect(() => {
    const handleProgress = (updatedVlogId: string, updatedProgress: number) => {
      console.log(
        `[ConvertButton] Received progress: vlogId=${updatedVlogId}, progress=${updatedProgress}%`,
      )
      if (updatedVlogId === vlogId) {
        console.log(
          `[ConvertButton] Updating progress for ${vlogId}: ${updatedProgress}%`,
        )
        setProgress(updatedProgress)
        // Reset state when conversion completes
        if (updatedProgress >= 100) {
          setTimeout(() => {
            setIsConverting(false)
            setProgress(0)
          }, 500) // Small delay to show 100% before resetting
        }
      }
    }

    if (window.electronAPI.onConversionProgress) {
      window.electronAPI.onConversionProgress(handleProgress)
    }

    return () => {
      if (window.electronAPI.removeConversionProgressListener) {
        window.electronAPI.removeConversionProgressListener()
      }
    }
  }, [vlogId])

  const handleConvertToMp4 = async () => {
    if (
      !confirm(
        `Convert "${vlog?.name ?? 'this video'}" to MP4? This may take a few minutes.`,
      )
    ) {
      return
    }

    setIsConverting(true)
    setProgress(0)

    try {
      const result = await convertToMp4(vlogId)
      alert(result.message)
    } catch (error) {
      console.error('Failed to convert video:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to convert video'
      alert(errorMessage)
    } finally {
      setIsConverting(false)
      setProgress(0)
    }
  }

  const getButtonText = () => {
    if (isConverting) {
      if (progress > 0) {
        return (
          <>
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            <span>Converting... {progress}%</span>
          </>
        )
      }
      return (
        <>
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          <span>Converting...</span>
        </>
      )
    }
    return (
      <>
        <Video size={16} strokeWidth={2} />
        <span>Convert to MP4</span>
      </>
    )
  }

  return (
    <Button
      variant="header"
      onClick={handleConvertToMp4}
      disabled={disabled || isConverting}
    >
      {getButtonText()}
    </Button>
  )
}
