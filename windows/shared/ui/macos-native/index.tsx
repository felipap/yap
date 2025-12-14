import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'
import { twMerge } from 'tailwind-merge'

interface TitleProps {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}

export function Title({ children, htmlFor, className }: TitleProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={twMerge('block text-md font-medium text-contrast', className)}
    >
      {children}
    </label>
  )
}

interface SubtitleProps {
  children: React.ReactNode
  className?: string
}

export function Subtitle({ children, className }: SubtitleProps) {
  return (
    <p
      className={twMerge(
        'text-sm track-10 font-text text-secondary mb-2',
        className,
      )}
    >
      {children}
    </p>
  )
}

const buttonVariants = cva(
  'px-4 h-[24px] text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-highlight text-white hover:bg-highlight/90',
        secondary: 'bg-[#E4E4E4] dark:bg-[#3D3C3B] text-contrast',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function MacOsButton({
  children,
  variant,
  onClick,
  className,
  disabled,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={twMerge(buttonVariants({ variant }), className)}
    >
      {children}
    </button>
  )
}
