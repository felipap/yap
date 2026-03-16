import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { setLogTitle } from '../../../../shared/ipc'

interface Props {
  logId: string
  title: string
  isVideo: boolean
}

export function TitleInput({ logId, isVideo, title }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localTitle, setLocalTitle] = useState(title)

  // Sync with external title changes (e.g., from backend updates)
  useEffect(() => {
    setLocalTitle(title)
  }, [title])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [localTitle])

  return (
    <textarea
      ref={textareaRef}
      className={twMerge(
        'bg-transparent text-contrast !shadow-0 outline-0 select-none !ring-0 !border-0 rounded px-3 ml-[-5px] py-1 text-[20px] font-bold transition resize-none overflow-hidden whitespace-pre-wrap break-words',
        localTitle.length > 0
          ? ''
          : 'placeholder:text-contrast !opacity-40 focus:opacity-80',
      )}
      placeholder={isVideo ? 'Untitled video' : 'Untitled audio'}
      value={localTitle}
      rows={1}
      onChange={(e) => {
        setLocalTitle(e.target.value)
        // Auto-resize textarea
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
      }}
      onBlur={async (e) => {
        const value = e.target.value.trim()
        try {
          await setLogTitle(logId, value)
        } catch (error) {
          console.error('Failed to save title', error)
        }
      }}
      onKeyDown={async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          const textarea = e.currentTarget as HTMLTextAreaElement
          const value = textarea.value.trim()
          try {
            await setLogTitle(logId, value)
            textarea.blur()
          } catch (error) {
            console.error('Failed to save title', error)
          }
        }
      }}
    />
  )
}
