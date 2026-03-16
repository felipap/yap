import { ReactNode } from 'react'

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
  children: ReactNode
}

export function ShrinkingPlayer({ children }: Props) {
  return <>{children}</>
}
