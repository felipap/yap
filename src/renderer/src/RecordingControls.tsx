import React from 'react'

export type RecordingMode = 'screen' | 'camera' | 'both'

interface RecordingControlsProps {
  isRecording: boolean
  recordingMode: RecordingMode
  cameras: MediaDeviceInfo[]
  selectedCameraId: string
  onRecordingModeChange: (mode: RecordingMode) => void
  onCameraChange: (cameraId: string) => void
  onStartRecording: () => void
  onStopRecording: () => void
}

export function RecordingControls({
  isRecording,
  recordingMode,
  cameras,
  selectedCameraId,
  onRecordingModeChange,
  onCameraChange,
  onStartRecording,
  onStopRecording
}: RecordingControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!isRecording && (
        <>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={recordingMode === 'screen' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onRecordingModeChange('screen')}
            >
              🖥️ Screen
            </button>
            <button
              className={recordingMode === 'camera' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onRecordingModeChange('camera')}
            >
              📹 Camera
            </button>
            <button
              className={recordingMode === 'both' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onRecordingModeChange('both')}
            >
              🎬 Both
            </button>
          </div>

          {(recordingMode === 'camera' || recordingMode === 'both') && cameras.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Camera:
              </label>
              <select
                value={selectedCameraId}
                onChange={(e) => onCameraChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isRecording ? (
          <>
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording {recordingMode}...</span>
            </div>
            <button
              className="btn-danger"
              onClick={onStopRecording}
            >
              ⏹️ Stop Recording
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            onClick={onStartRecording}
          >
            🔴 Start Recording {recordingMode === 'screen' ? 'Screen' : recordingMode === 'camera' ? 'Camera' : 'Screen + Camera'}
          </button>
        )}
      </div>
    </div>
  )
}

