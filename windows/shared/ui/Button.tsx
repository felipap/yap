import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'px-3 h-6 rounded-md font-medium transition-all text-sm text-nowrap flex items-center gap-2',
  {
    variants: {
      variant: {
        primary: 'bg-two text-contrast hover:bg-three',
        secondary: 'bg-two text-contrast hover:bg-three',
        recording:
          'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-102',
        stop: 'w-full px-6 h-16 sm:px-8 sm:h-20 bg-red-500 hover:bg-red-600 text-white text-lg sm:text-xl font-bold rounded-xl shadow-lg transition-all hover:shadow-xl',
        header:
          'text-nowrap text-[13px] rounded-lg flex items-center gap-2 h-8 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700',
        danger:
          'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/50',
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
