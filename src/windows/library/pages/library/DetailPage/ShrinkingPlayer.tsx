import { ReactNode, useEffect, useState } from 'react'

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
  children: ReactNode
}

const MAX_HEIGHT = 350
const MIN_HEIGHT = 150
const SCROLL_THRESHOLD = 800

export function ShrinkingPlayer({ scrollRef, disabled, children }: Props) {
  const [height, setHeight] = useState(MAX_HEIGHT)

  useEffect(() => {
    if (disabled) {
      return
    }

    const container = scrollRef.current
    if (!container) {
      return
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const progress = Math.min(scrollTop / SCROLL_THRESHOLD, 1)
      const newHeight = MAX_HEIGHT - progress * (MAX_HEIGHT - MIN_HEIGHT)
      setHeight(newHeight)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef, disabled])

  if (disabled) {
    return <>{children}</>
  }

  return <div style={{ height }}>{children}</div>
}
