import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { generateVideoSummary, saveVideoSummary } from '../../../ipc'
import { withBoundary } from '../../../shared/withBoundary'
import { RecordedFile } from '../../../types'

interface Props {
  vlog: RecordedFile
  transcription?: string
}

export const VideoSummaryPanel = withBoundary(function ({
  vlog,
  transcription,
}: Props) {
  const [summary, setSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
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
      setIsEditing(false)
    } catch (error) {
      console.error('Summary generation failed:', error)
      setError(
        error instanceof Error ? error.message : 'Summary generation failed',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveSummary = async () => {
    try {
      await saveVideoSummary(vlog.id, summary)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save summary:', error)
      setError('Failed to save summary')
    }
  }

  const handleCancelEdit = () => {
    // Reset to the saved summary from vlog object
    setSummary(vlog.summary || '')
    setIsEditing(false)
  }

  // Don't show the panel if there's no transcription
  if (!transcription) {
    return null
  }

  return (
    <div className="bg-two rounded-lg p-2 border">
      <div className="flex justify-between">
        <header className="text-[14px] font-semibold text-contrast m-0 p-2">
          Summary
        </header>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary text-sm"
                disabled={!summary}
              >
                ✏️ Edit
              </button>
              <button
                onClick={handleGenerateSummary}
                className="btn-primary text-sm"
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '🔄 Regenerate'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveSummary}
                className="btn-primary text-sm"
              >
                💾 Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn-secondary text-sm"
              >
                ❌ Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {summary ? (
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={twMerge(
            `w-full h-[300px] p-3 rounded resize-none text-sm text-contrast bg-transparent border-none`,
            isEditing
              ? 'border-highlight-color focus:outline-none focus:ring-2 focus:ring-highlight-color'
              : 'border-transparent focus:outline-none',
          )}
          readOnly={!isEditing}
          placeholder="No summary available. Click 'Regenerate' to create one."
        />
      ) : (
        <div className=" p-3 flex items-center justify-center text-text-secondary">
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
