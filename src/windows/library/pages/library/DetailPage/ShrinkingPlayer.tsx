import { ReactNode, useEffect, useRef } from 'react'

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
  children: ReactNode
}

const MAX_HEIGHT = 350
const MIN_HEIGHT = 150
const SCROLL_START = 400
const SCROLL_RANGE = 400

// Shrinks the video player as the user scrolls down the page.
// Stays at MAX_HEIGHT until SCROLL_START, then interpolates to MIN_HEIGHT over SCROLL_RANGE pixels.
export function ShrinkingPlayer({ scrollRef, disabled, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) {
      return
    }

    const container = scrollRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) {
      return
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      let newHeight: number
      if (scrollTop <= SCROLL_START) {
        newHeight = MAX_HEIGHT
      } else {
        const progress = Math.min((scrollTop - SCROLL_START) / SCROLL_RANGE, 1)
        newHeight = MAX_HEIGHT - progress * (MAX_HEIGHT - MIN_HEIGHT)
      }
      wrapper.style.height = `${newHeight}px`
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef, disabled])

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div ref={wrapperRef} style={{ height: MAX_HEIGHT }}>
      {children}
    </div>
  )
}
