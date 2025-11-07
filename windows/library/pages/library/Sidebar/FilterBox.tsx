import { twMerge } from 'tailwind-merge'
import { SearchIcon } from '../../../../shared/icons'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function FilterBox({ value, onChange }: Props) {
  return (
    <div className="border-t border-contrast/10 p-1.5 bg-sidebar group">
      <div className="relative">
        <SearchIcon
          className={twMerge(
            'absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary transition group-focus:opacity-20',
            // !value && 'opacity-50',
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter"
          className="w-full pl-7 pr-2 py-1 text-xs bg-one  rounded text-contrast border border-contrast/10 outline-none tracking-normal placeholder:text-secondary/50 focus:outline-none focus:shadow-blue-300/50 transition"
        />
      </div>
    </div>
  )
}
