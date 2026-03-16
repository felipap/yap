import { useEffect, useRef, useState } from 'react'
import { triggerGenerateSummary } from '~/shared/ipc'
import { EnrichedLog } from '../../../../types'

export function useSummary(log: EnrichedLog) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const summaryAtGenerateStart = useRef<string | null>(null)

  const summary = log.summary || ''

  const hasEmptyTranscription =
    log.transcription &&
    (!log.transcription.text || log.transcription.text.trim().length === 0)

  // Summary file exists but is empty = attempted but no meaningful content
  const hasSummaryFile = log.summary !== null && log.summary !== undefined
  const hasEmptySummary = hasSummaryFile && log.summary === ''

  useEffect(() => {
    if (isGenerating && summary !== summaryAtGenerateStart.current) {
      setIsGenerating(false)
      summaryAtGenerateStart.current = null
    }
  }, [isGenerating, summary])

  const handleGenerateSummary = async () => {
    if (!log.transcription) {
      setError('No transcription available to generate summary')
      return
    }

    summaryAtGenerateStart.current = summary
    setIsGenerating(true)
    setError(null)

    try {
      await triggerGenerateSummary(log.id)
      setTimeout(() => {
        setIsGenerating(false)
        summaryAtGenerateStart.current = null
      }, 30000)
    } catch (err) {
      console.error('Summary generation failed:', err)
      setError(err instanceof Error ? err.message : 'Summary generation failed')
      setIsGenerating(false)
      summaryAtGenerateStart.current = null
    }
  }

  return {
    summary,
    hasEmptyTranscription,
    hasEmptySummary,
    hasTranscription: !!log.transcription,
    isGenerating,
    error,
    handleGenerateSummary,
  }
}
