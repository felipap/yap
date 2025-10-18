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
      className="bg-transparent text-contrast !shadow-0 outline-0 select-none !ring-0 !border-0 rounded px-2 ml-[-5px] py-1 text-[20px] h-7 placeholder:opacity-10 font-bold focus:placeholder:opacity-60 !transition"
      placeholder="Name your vlog"
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
