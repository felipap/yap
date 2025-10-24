import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { RecordingMode } from '../../../../shared-types'

export interface PreviewScreenRef {
  srcObject: MediaProvider | null
}

interface Props {
  mode: RecordingMode
}

export const PreviewScreen = forwardRef<PreviewScreenRef, Props>(
  (props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [hasVideo, setHasVideo] = useState(false)

    useImperativeHandle(ref, () => ({
      get srcObject() {
        return videoRef.current?.srcObject || null
      },
      set srcObject(srcObject: MediaProvider | null) {
        setHasVideo(srcObject !== null)
        if (videoRef.current) {
          videoRef.current.srcObject = srcObject
        }
      },
    }))

    return (
      <div className="relative w-full flex-1 min-h-0 bg-gray-900 rounded-2xl overflow-hidden border-4 border-one shadow-2xl">
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="w-full flex items-center justify-center h-[340px]">
            <div className="text-8xl">
              {props.mode === 'camera' ? '📹' : '🖥️'}
            </div>
          </div>
        )}
      </div>
    )
  },
)
