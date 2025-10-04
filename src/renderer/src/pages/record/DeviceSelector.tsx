import { Select } from '../../shared/ui/Select'
import { VolumeMeter } from './VolumeMeter'
import { Camera, Mic } from 'lucide-react'

interface DeviceSelectorProps {
  cameras: MediaDeviceInfo[]
  microphones: MediaDeviceInfo[]
  selectedCameraId: string
  selectedMicrophoneId: string
  onCameraChange: (cameraId: string) => void
  onMicrophoneChange: (microphoneId: string) => void
  recordingMode: 'screen' | 'camera' | 'both'
  isRecording: boolean
}

export function DeviceSelector({
  cameras,
  microphones,
  selectedCameraId,
  selectedMicrophoneId,
  onCameraChange,
  onMicrophoneChange,
  recordingMode,
  isRecording,
}: DeviceSelectorProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl flex-shrink-0">
      {/* Device Selection - Hidden when recording */}
      {!isRecording && (
        <div className="flex gap-4 items-center">
          {/* Camera Selection */}
          {(recordingMode === 'camera' || recordingMode === 'both') &&
            cameras.length > 0 && (
              <div className="flex gap-3 items-center">
                <div className="flex items-center justify-center w-8 h-8">
                  <Camera size={20} />
                </div>
                <Select value={selectedCameraId} onChange={onCameraChange}>
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label ||
                        `Camera ${camera.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </Select>
              </div>
            )}

          {/* Microphone Selection */}
          {microphones.length > 0 && (
            <div className="flex gap-3 items-center">
              <div className="flex items-center justify-center w-8 h-8">
                <Mic size={20} />
              </div>
              <Select
                value={selectedMicrophoneId}
                onChange={onMicrophoneChange}
              >
                {microphones.map((microphone) => (
                  <option key={microphone.deviceId} value={microphone.deviceId}>
                    {microphone.label ||
                      `Microphone ${microphone.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </Select>

              {/* Volume Meter */}
              {selectedMicrophoneId && (
                <VolumeMeter
                  microphoneId={selectedMicrophoneId}
                  size="sm"
                  showLabel={false}
                  className="w-[20px]"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
