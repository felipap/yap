import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { MdMic, MdVideocam, MdDesktopMac } from 'react-icons/md'
import { RecordingMode } from '../../../../shared-types'
import { twMerge } from 'tailwind-merge'

const FIT_MODE = 'cover' as 'contain' | 'cover'

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
        // Set srcObject first, then update visibility state
        if (videoRef.current) {
          videoRef.current.srcObject = srcObject
        }
        setHasVideo(srcObject !== null)
      },
    }))

    // For audio mode, don't show a video preview at all
    if (props.mode === 'audio') {
      return (
        <div className="relative w-full flex-1 min-h-0 max-h-[1000px] bg-gray-900 rounded-2xl overflow-hidden border-4 shadow-2xl">
          <div className="w-full flex items-center justify-center h-[340px]">
            <MdMic size={120} className="text-gray-400" />
          </div>
        </div>
      )
    }

    return (
      <div className="relative w-full flex-1 min-h-0 h-full bg-gray-900 rounded-2xl overflow-hidden border-4 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={twMerge(
            `w-full h-full`,
            FIT_MODE === 'contain' ? 'object-contain' : 'object-cover',
            'object-center',
            hasVideo ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform:
              props.mode === 'camera' || props.mode === 'both'
                ? 'scaleX(-1)'
                : 'none',
          }}
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            {props.mode === 'camera' ? (
              <MdVideocam size={120} className="text-gray-400" />
            ) : (
              <MdDesktopMac size={120} className="text-gray-400" />
            )}
          </div>
        )}
      </div>
    )
  },
)
