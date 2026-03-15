import { SearchIcon } from '../../../../shared/icons'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function FilterBox({ value, onChange }: Props) {
  return (
    <div className="border-t p-1 group">
      <div className="relative">
        <SearchIcon
          className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary transition group-focus:opacity-20"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter"
          className="w-full pl-7 pr-2 py-1 text-[12px] leading-none h-[27px] bg-transparent rounded text-contrast  shadow-none ring-0 border-none outline-none tracking-normal placeholder:text-secondary/80 focus:outline-none focus:border-blue-300/60 dark:focusss:shadow-blue-300 transition"
        />
      </div>
    </div>
  )
}
