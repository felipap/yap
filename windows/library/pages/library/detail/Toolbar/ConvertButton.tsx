import { useEffect, useState } from 'react'
import { MdRefresh, MdVideocam } from 'react-icons/md'
import { convertToMp4, getConversionState } from '../../../../../shared/ipc'
import { Button } from '../../../../../shared/ui/Button'

interface Props {
  logId: string
  disabled?: boolean
}

export function ConvertButton({ logId, disabled }: Props) {
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Check and restore conversion state on mount
  useEffect(() => {
    const checkConversionState = async () => {
      try {
        const state = await getConversionState(logId)
        if (state.isActive) {
          setIsConverting(true)
          setProgress(state.progress ?? 0)
        }
      } catch (error) {
        console.error('Failed to get conversion state:', error)
      }
    }

    checkConversionState()
  }, [logId])

  useEffect(() => {
    const handleProgress = (updatedLogId: string, updatedProgress: number) => {
      console.log(
        `[ConvertButton] Received progress: logId=${updatedLogId}, progress=${updatedProgress}%`,
      )
      if (updatedLogId === logId) {
        console.log(
          `[ConvertButton] Updating progress for ${logId}: ${updatedProgress}%`,
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
  }, [logId])

  const handleConvertToMp4 = async () => {
    if (!confirm(`Convert file to MP4? This may take a few minutes.`)) {
      return
    }

    setIsConverting(true)
    setProgress(0)

    try {
      const result = await convertToMp4(logId)
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
            <MdRefresh size={16} className="animate-spin" />
            <span>Converting {progress}%</span>
          </>
        )
      }
      return (
        <>
          <MdRefresh size={16} className="animate-spin" />
          <span>Converting</span>
        </>
      )
    }
    return (
      <>
        <MdVideocam size={16} />
        <span>Convert to MP4</span>
      </>
    )
  }

  return (
    <Button onClick={handleConvertToMp4} disabled={disabled || isConverting}>
      {getButtonText()}
    </Button>
  )
}
