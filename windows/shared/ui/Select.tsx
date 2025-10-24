interface SelectProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Select({
  value,
  onChange,
  children,
  className = '',
}: SelectProps) {
  const baseClasses =
    'px-3 h-7.5 py-0 rounded-md font-medium transition-all text-sm bg-two text-contrast hover:bg-three focus:outline-none'

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
