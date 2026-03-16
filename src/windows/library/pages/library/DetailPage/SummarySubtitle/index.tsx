import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { RefreshIcon } from '~/shared/icons'
import { EnrichedLog } from '../../../../types'
import { useSummary } from './useSummary'

interface Props {
  log: EnrichedLog
}

export function SummarySubtitle({ log }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  const {
    summary,
    hasEmptyTranscription,
    hasTranscription,
    isGenerating,
    error,
    handleGenerateSummary,
  } = useSummary(log)

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight,
      )
    }
  }, [summary])

  if (!summary) {
    if (!hasTranscription) {
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
          label={isGenerating ? 'Summarizing...' : 'Summarize'}
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
              !isExpanded && 'hover:opacity-80',
            )}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <GenerateButton
          onClick={handleGenerateSummary}
          isGenerating={isGenerating}
          label={isGenerating ? 'Summarizing...' : 'Try again'}
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
      <RefreshIcon
        className={twMerge('w-3 h-3', isGenerating && 'animate-spin')}
      />
      {label}
    </button>
  )
}
