interface HeaderButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
}

export function HeaderButton({
  children,
  onClick,
  disabled,
  variant = 'default',
}: HeaderButtonProps) {
  const baseClasses =
    'text-nowrap text-[13px] font-medium rounded-lg transition-all flex items-center gap-2 h-8 px-3'
  const variantClasses =
    variant === 'danger'
      ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/50'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
  const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
