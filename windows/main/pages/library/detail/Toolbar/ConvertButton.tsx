import { useState, useEffect } from 'react'
import { convertToMp4 } from '../../../../../shared/ipc'
import { useVlog } from '../../../../../shared/useVlogData'
import { HeaderButton } from './HeaderButton'

interface ConvertButtonProps {
  vlogId: string
  disabled?: boolean
}

export function ConvertButton({ vlogId, disabled }: ConvertButtonProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const { vlog } = useVlog(vlogId)

  useEffect(() => {
    const handleProgress = (updatedVlogId: string, updatedProgress: number) => {
      if (updatedVlogId === vlogId) {
        setProgress(updatedProgress)
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
        return `⏳ Converting... ${progress}%`
      }
      return '⏳ Converting...'
    }
    return '🎬 Convert to MP4'
  }

  return (
    <HeaderButton
      onClick={handleConvertToMp4}
      disabled={disabled || isConverting}
    >
      {getButtonText()}
    </HeaderButton>
  )
}
