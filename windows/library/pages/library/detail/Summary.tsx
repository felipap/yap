import { useEffect, useState } from 'react'
import { ClockIcon, CopyIcon, RefreshIcon } from '../../../../shared/icons'
import { generateVideoSummary } from '../../../../shared/ipc'
import { withBoundary } from '../../../../shared/withBoundary'
import { EnrichedLog } from '../../../types'

interface Props {
  vlog: EnrichedLog
}

export const Summary = withBoundary(function ({ vlog }: Props) {
  const [summary, setSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setSummary(vlog.summary || '')
  }, [vlog.summary])

  const handleGenerateSummary = async () => {
    if (!vlog.transcription) {
      setError('No transcription available to generate summary')
      return
    }

    if (
      !vlog.transcription.text ||
      vlog.transcription.text.trim().length === 0
    ) {
      setError('Transcription is empty. Please transcribe the video first.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const generatedSummary = await generateVideoSummary(
        vlog.id,
        vlog.transcription.text,
      )
      setSummary(generatedSummary)
    } catch (error) {
      console.error('Summary generation failed:', error)
      setError(
        error instanceof Error ? error.message : 'Summary generation failed',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) {
      return
    }

    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy summary:', error)
    }
  }

  if (!vlog.transcription) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-contrast">Summary</div>
          {summary && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-hover transition-all opacity-60 hover:opacity-100"
              title={copied ? 'Copied!' : 'Copy summary to clipboard'}
            >
              <CopyIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleGenerateSummary}
          className="btn-primary text-xs font-medium opacity-70 hover:opacity-100 transition-all flex items-center gap-1"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <ClockIcon className="w-3 h-3" />
              Generating...
            </>
          ) : (
            <>
              <RefreshIcon className="w-3 h-3" />
              Regenerate
            </>
          )}
        </button>
      </header>

      {summary ? (
        <div className="text-sm text-contrast border dark:bg-white/5 p-3 leading-[1.45] track-20 rounded-md">
          {summary}
        </div>
      ) : (
        <div className="p-3 flex items-center justify-center text-text-secondary">
          <div className="text-sm">Click 'Regenerate' to create a summary</div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  )
})
