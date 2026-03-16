import { useCallback, useEffect, useRef, useState } from 'react'
import { MicrophoneIcon } from '~/shared/icons'
import {
  getRecordingMode,
  setRecordingMode as saveRecordingMode,
} from '~/shared/ipc'
import { useRouter } from '~/shared/Router'
import { VolumeMeter } from '~/shared/ui/VolumeMeter'
import { RecordingMode } from '../../types'
import { PillButton, RecordButton } from './buttons'
import { useCameras } from './hooks/useCameras'
import { useMicrophones } from './hooks/useMicrophones'
import { usePreviewStreams } from './hooks/usePreviewStreams'
import { useRecording } from './hooks/useRecording'
import { PreviewScreen, PreviewScreenRef } from './PreviewScreen'
import { RecordingModeSelector } from './RecordingModeSelector'

interface Props {
  close: () => void
}

export function RecordInner({ close }: Props) {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('camera')
  const { selectedMicrophoneId } = useMicrophones()
  const { cameras, selectedCameraId } = useCameras()
  const previewRef = useRef<PreviewScreenRef | null>(null)

  const hasCamera = cameras.length > 0
  const canRecord =
    recordingMode === 'screen' ||
    recordingMode === 'audio' ||
    (recordingMode === 'camera' && hasCamera) ||
    (recordingMode === 'both' && hasCamera)

  const { isRecording, isPaused, recordingTime, start, stop, togglePause } =
    useRecording({
      recordingMode,
      cameraId: selectedCameraId,
      microphoneId: selectedMicrophoneId,
      previewRef,
      onRecordingComplete: () => router.navigate({ name: 'library' }),
    })

  usePreviewStreams({
    recordingMode,
    selectedCameraId,
    isRecording,
    previewRef,
  })

  const loadSettings = useCallback(async () => {
    const savedMode = await getRecordingMode()
    if (savedMode) {
      setRecordingMode(savedMode)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <div className="flex flex-col h-full overflow-hidden dark:bg-one/40 bg-white/20">
      <div className="h-10  shrink-0 drag-region" />
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        {/* Preview Area */}
        <div className="flex flex-col items-center gap-4 w-full flex-1 min-h-0">
          <div className="relative w-full h-full">
            <PreviewScreen mode={recordingMode} ref={previewRef} />
          </div>
        </div>

        {/* Controls - Recording Mode Selection */}
        {!isRecording && (
          <div className="absolute flex flex-col gap-4 w-full shrink-0 z-10 px-4">
            <RecordingModeSelector
              recordingMode={recordingMode}
              onModeChange={(mode) => {
                setRecordingMode(mode)
                saveRecordingMode(mode)
              }}
              isRecording={isRecording}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative flex items-center justify-center py-4 px-6 shrink-0 h-[80px]">
        <div className="absolute left-6 flex items-center gap-3">
          {selectedMicrophoneId && (
            <>
              <MicrophoneIcon />
              <VolumeMeter
                microphoneId={selectedMicrophoneId}
                size="sm"
                showLabel={false}
              />
            </>
          )}
        </div>
        <RecordButton
          isRecording={isRecording}
          isPaused={isPaused}
          disabled={!canRecord}
          onStartRecording={start}
          onTogglePause={togglePause}
        />
        {isRecording && !isPaused && (
          <div className="absolute right-8 text-[19px] font- text-contrast tabular-nums">
            {formatTime(recordingTime)}
          </div>
        )}
        {isRecording && isPaused && (
          <div className="absolute right-6">
            <PillButton onClick={stop}>Done</PillButton>
          </div>
        )}
        {!isRecording && (
          <div className="absolute right-6">
            <PillButton onClick={close}>Library</PillButton>
          </div>
        )}
      </footer>
    </div>
  )
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
