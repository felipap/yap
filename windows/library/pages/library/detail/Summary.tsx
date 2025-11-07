import { useEffect, useState } from 'react'
import { ClockIcon, RefreshIcon } from '../../../../shared/icons'
import { generateVideoSummary } from '../../../../shared/ipc'
import { withBoundary } from '../../../../shared/withBoundary'
import { RecordedFile } from '../../../types'

interface Props {
  vlog: RecordedFile
}

export const Summary = withBoundary(function ({ vlog }: Props) {
  const [summary, setSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSummary(vlog.summary || '')
  }, [vlog.summary])

  const handleGenerateSummary = async () => {
    if (!vlog.transcription) {
      setError('No transcription available to generate summary')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const generatedSummary = await generateVideoSummary(
        vlog.id,
        vlog.transcription.text || '',
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

  if (!vlog.transcription) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <header className="flex justify-between items-center">
        <div className="text-sm font-semibold text-contrast">Summary</div>
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
        <div className="text-sm text-contrast leading-relaxed">{summary}</div>
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
