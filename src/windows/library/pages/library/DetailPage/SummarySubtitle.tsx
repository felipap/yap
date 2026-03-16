import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ClockIcon, RefreshIcon } from '../../../../shared/icons'
import { triggerGenerateSummary } from '../../../../shared/ipc'
import { EnrichedLog } from '../../../types'

interface Props {
  log: EnrichedLog
}

export function SummarySubtitle({ log }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const summary = log.summary || ''

  const hasEmptyTranscription =
    log.transcription &&
    (!log.transcription.text || log.transcription.text.trim().length === 0)

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight,
      )
    }
  }, [summary])

  const handleGenerateSummary = async () => {
    if (!log.transcription) {
      setError('No transcription available to generate summary')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      await triggerGenerateSummary(log.id)
    } catch (err) {
      console.error('Summary generation failed:', err)
      setError(err instanceof Error ? err.message : 'Summary generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!summary) {
    if (!log.transcription) {
      return <div className="text-[13px] text-contrast opacity-40 ml-1">—</div>
    }

    if (hasEmptyTranscription) {
      return (
        <div className="text-[13px] text-contrast opacity-60 italic">
          nothing to transcribe
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <div className="text-[13px] text-contrast opacity-40">
          No summary yet
        </div>
        <GenerateButton
          onClick={handleGenerateSummary}
          isGenerating={isGenerating}
          label="Generate"
        />
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 group">
      <div
        ref={textRef}
        className={twMerge(
          'text-[13px] text-contrast opacity-60 leading-[1.35] pr-3',
          !isExpanded && 'line-clamp-4',
        )}
      >
        {summary}
      </div>
      <div className="flex items-center gap-2">
        {isTruncated && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className={twMerge(
              'text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity mr-2',
              !isExpanded && 'group-hover:opacity-80',
            )}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <GenerateButton
          onClick={handleGenerateSummary}
          isGenerating={isGenerating}
          label="Try again"
        />
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    </div>
  )
}

interface GenerateButtonProps {
  onClick: () => void
  isGenerating: boolean
  label: string
}

function GenerateButton({ onClick, isGenerating, label }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
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
          {label}
        </>
      )}
    </button>
  )
}
