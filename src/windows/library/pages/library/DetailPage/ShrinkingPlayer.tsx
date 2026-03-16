import { ReactNode, useEffect, useRef } from 'react'

const PLAYER_MAX_HEIGHT = 350
const PLAYER_MIN_HEIGHT = 120

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
  children: ReactNode
}

export function ShrinkingPlayer({ scrollRef, disabled, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper || disabled) {
      return
    }

    const handleScroll = () => {
      // Disabled for now - just use min height
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef, disabled])

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden"
      style={{ height: PLAYER_MAX_HEIGHT }}
    >
      {children}
    </div>
  )
}
