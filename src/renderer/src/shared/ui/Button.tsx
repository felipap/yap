interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'recording' | 'stop'
  isActive?: boolean
  className?: string
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  isActive = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'px-3 h-6 rounded-md font-medium transition-all text-sm'

  const variantClasses = {
    primary: isActive
      ? 'bg-blue-500 text-white shadow-md'
      : 'bg-two text-contrast hover:bg-three',
    secondary: isActive
      ? 'bg-blue-500 text-white shadow-md'
      : 'bg-two text-contrast hover:bg-three',
    recording:
      'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105',
    stop: 'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
