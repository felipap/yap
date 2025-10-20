interface HeaderButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

export function HeaderButton({
  children,
  onClick,
  disabled,
}: HeaderButtonProps) {
  return (
    <button
      className="btn-secondary text-nowrap text-[12px] rounded-md border hover:opacity-80 transition-opacity bg-two h-7 px-2"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
