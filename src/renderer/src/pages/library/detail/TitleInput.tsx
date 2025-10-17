import { setVlogTitle } from '../../../ipc'

interface TitleInputProps {
  vlogId: string
  title: string
  onLocalTitleChange: (value: string) => void
}

export function TitleInput({
  vlogId,
  title,
  onLocalTitleChange,
}: TitleInputProps) {
  return (
    <input
      className="bg-two text-primary border rounded px-2 py-1 text-[14px] h-7"
      placeholder="Add a title"
      value={title}
      onChange={(e) => onLocalTitleChange(e.target.value)}
      onBlur={async (e) => {
        const value = e.target.value.trim()
        try {
          await setVlogTitle(vlogId, value)
        } catch (error) {
          console.error('Failed to save title', error)
        }
      }}
      onKeyDown={async (e) => {
        if (e.key === 'Enter') {
          const input = e.currentTarget as HTMLInputElement
          const value = input.value.trim()
          try {
            await setVlogTitle(vlogId, value)
            input.blur()
          } catch (error) {
            console.error('Failed to save title', error)
          }
        }
      }}
    />
  )
}
