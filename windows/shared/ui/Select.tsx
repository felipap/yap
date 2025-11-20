interface Props {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Select({ value, onChange, children, className = '' }: Props) {
  const baseClasses =
    'pl-3 pr-8 h-7.5 py-0 rounded-md font-medium transition-all text-sm bg-two text-contrast hover:bg-three focus:outline-none truncate'

  return (
    <select
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
      }}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </select>
  )
}
