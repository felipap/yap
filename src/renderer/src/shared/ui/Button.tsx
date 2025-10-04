import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'px-3 h-6 rounded-md font-medium transition-all text-sm',
  {
    variants: {
      variant: {
        primary: 'bg-two text-contrast hover:bg-three',
        secondary: 'bg-two text-contrast hover:bg-three',
        recording:
          'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105',
        stop: 'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl',
      },
      isActive: {
        true: 'bg-blue-500 text-white shadow-md',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: ['primary', 'secondary'],
        isActive: true,
        class: 'bg-blue-500 text-white shadow-md',
      },
    ],
    defaultVariants: {
      variant: 'secondary',
      isActive: false,
    },
  },
)

interface Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  onClick: () => void
}

export function Button({
  children,
  onClick,
  variant,
  isActive,
  className,
  ...props
}: Props) {
  return (
    <button
      className={twMerge(buttonVariants({ variant, isActive }), className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}
