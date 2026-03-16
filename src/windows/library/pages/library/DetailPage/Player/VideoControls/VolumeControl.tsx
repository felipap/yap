import { RefObject, useEffect, useRef, useState } from 'react'
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '~/shared/icons'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  isMuted: boolean
  toggleMute: () => void
}

export function VolumeControl({ videoRef, isMuted, toggleMute }: Props) {
  const [volume, setVolume] = useState(1)
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeSliderRef = useRef<HTMLDivElement>(null)

  // Update volume
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleVolumeChange = () => {
      if (!isDraggingVolume) {
        setVolume(video.volume)
      }
    }

    video.addEventListener('volumechange', handleVolumeChange)
    setVolume(video.volume)

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [videoRef, isDraggingVolume])

  const handleVolumeSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const slider = volumeSliderRef.current
    if (!video || !slider) {
      return
    }

    const rect = slider.getBoundingClientRect()
    // Calculate volume based on Y position relative to slider, clamping to slider bounds
    const percent = Math.max(
      0,
      Math.min(1, (rect.bottom - e.clientY) / rect.height),
    )
    video.volume = percent
    setVolume(percent)
  }

  const handleVolumeSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingVolume(true)
    handleVolumeSliderClick(e)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const video = videoRef.current
      const slider = volumeSliderRef.current
      if (!video || !slider) {
        return
      }

      const rect = slider.getBoundingClientRect()
      const percent = Math.max(
        0,
        Math.min(1, (rect.bottom - moveEvent.clientY) / rect.height),
      )
      video.volume = percent
      setVolume(percent)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingVolume(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // Keep slider visible if mouse is still over the control area
      const slider = volumeSliderRef.current
      if (slider) {
        const rect = slider.getBoundingClientRect()
        const mouseX = upEvent.clientX
        const mouseY = upEvent.clientY
        // Check if mouse is within a reasonable area around the slider
        const padding = 10
        if (
          mouseX >= rect.left - padding &&
          mouseX <= rect.right + padding &&
          mouseY >= rect.top - padding &&
          mouseY <= rect.bottom + padding
        ) {
          setShowVolumeSlider(true)
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className="relative flex items-center"
      style={{
        paddingLeft: '24px',
        paddingRight: '24px',
        marginLeft: '-24px',
        marginRight: '-24px',
      }}
      onMouseEnter={() => {
        setShowVolumeSlider(true)
      }}
      onMouseLeave={() => {
        if (!isDraggingVolume) {
          setShowVolumeSlider(false)
        }
      }}
    >
      {showVolumeSlider && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 cursor-pointer"
          style={{
            padding: '16px 24px',
            paddingBottom: 'calc(16px + 0.5rem + 16px)',
            marginBottom: 'calc(-0.5rem - 16px)',
          }}
          onMouseEnter={() => {
            setShowVolumeSlider(true)
          }}
          onMouseLeave={() => {
            if (!isDraggingVolume) {
              setShowVolumeSlider(false)
            }
          }}
          onClick={handleVolumeSliderClick}
          onMouseDown={handleVolumeSliderMouseDown}
        >
          <div
            ref={volumeSliderRef}
            className="relative w-1 h-20 bg-white/30 rounded-full mx-auto pointer-events-none"
          >
            <div
              className="absolute bottom-0 w-full bg-white rounded-full pointer-events-none"
              style={{ height: `${volume * 100}%` }}
            />
          </div>
        </div>
      )}
      <button
        onClick={toggleMute}
        className="hover:scale-110 transition-transform"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <VolumeOffIcon />
        ) : volume < 0.5 ? (
          <VolumeLowIcon />
        ) : (
          <VolumeHighIcon />
        )}
      </button>
    </div>
  )
}
