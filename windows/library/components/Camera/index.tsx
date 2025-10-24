import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface CameraRef {
  start: () => void
  stop: () => void
  srcObject: MediaProvider | null
}

interface Props {}

export const Camera = forwardRef<CameraRef, Props>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useImperativeHandle(ref, () => ({
    start: () => {
      videoRef.current?.play()
    },
    stop: () => {
      videoRef.current?.pause()
    },
    get srcObject() {
      return videoRef.current?.srcObject || null
    },
    set srcObject(srcObject: MediaProvider | null) {
      if (videoRef.current) {
        videoRef.current.srcObject = srcObject
      }
    },
  }))

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  )
})
