import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ClockIcon, CopyIcon, RefreshIcon } from '../../../../shared/icons'
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
  const [copied, setCopied] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  const summary = log.summary || ''

  // Check if transcription exists but has no words
  const hasTranscriptionButNoWords =
    log.transcription &&
    (!log.transcription.text || log.transcription.text.trim().length === 0)

  const isNothingToTranscribe = !summary && hasTranscriptionButNoWords

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

    // Let the AI "fail" - don't return early for empty transcription
    setIsGenerating(true)
    setError(null)

    try {
      await triggerGenerateSummary(log.id, log.transcription.text || '')
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

  if (!summary) {
    if (!log.transcription) {
      return null
    }

    // If transcription exists but has no words, show "nothing to transcribe" in italics
    if (hasTranscriptionButNoWords) {
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
        <button
          onClick={handleGenerateSummary}
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
              Generate
            </>
          )}
        </button>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 group">
      <div
        ref={textRef}
        onClick={() => {
          if (!isExpanded && isTruncated) {
            // setIsExpanded(true)
          }
        }}
        className={twMerge(
          'text-[13px] text-contrast opacity-60 leading-[1.35] cursor-default pr-3',
          isNothingToTranscribe && 'italic',
          !isExpanded && 'line-clamp-5',
          !isExpanded && isTruncated && 'cursor-pointer  transition-opacity',
        )}
      >
        {summary}
      </div>
      <div className="flex items-center gap-2">
        {isTruncated && (
          <button
            onClick={() => {
              setIsExpanded((v) => !v)
            }}
            className={twMerge(
              'text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity mr-2',
              !isExpanded && 'group-hover:opacity-80',
            )}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="text-xs text-contrast opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
          title={copied ? 'Copied!' : 'Copy summary'}
        >
          <CopyIcon className="w-2.5 h-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={handleGenerateSummary}
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
              Regenerate
            </>
          )}
        </button>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    </div>
  )
}
