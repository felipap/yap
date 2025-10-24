interface IconProps {
  size?: number
  className?: string
}

export function SolidSquare({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="16" height="16" fill="currentColor" />
    </svg>
  )
}


