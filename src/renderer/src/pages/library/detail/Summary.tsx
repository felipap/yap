import { useEffect, useState } from 'react'
import { Clock, RotateCcw } from 'lucide-react'
import { generateVideoSummary } from '../../../ipc'
import { withBoundary } from '../../../shared/withBoundary'
import { RecordedFile } from '../../../types'

interface Props {
  vlog: RecordedFile
  transcription?: string
}

export const Summary = withBoundary(function ({ vlog, transcription }: Props) {
  const [summary, setSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load summary when component mounts or when vlog.summary changes
  useEffect(() => {
    setSummary(vlog.summary || '')
  }, [vlog.summary]) // Depend on vlog.summary to update when it changes

  const handleGenerateSummary = async () => {
    if (!transcription) {
      setError('No transcription available to generate summary')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const generatedSummary = await generateVideoSummary(
        vlog.id,
        transcription,
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

  // Don't show the panel if there's no transcription
  if (!transcription) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <header className="flex justify-between">
        <div className="text-[14px] font-semibold text-contrast">Summary</div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateSummary}
            className="btn-primary text-xs font-medium opacity-70 hover:opacity-100  transition-all"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center">
                <RotateCcw className="w-3 h-3 mr-1" />
                Regenerate
              </div>
            )}
          </button>
        </div>
      </header>

      {summary ? (
        <div className="w-full max-h-[300px] rounded text-sm text-contrast bg-transparent border border-transparent leading-[1.4]  tracking-15">
          {summary}
        </div>
      ) : (
        <div className="p-3 flex items-center justify-center text-text-secondary">
          <div className="text-sm mt-1">
            Click 'Regenerate' to create a summary
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  )
})
