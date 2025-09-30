import React from 'react'

export type RecordingMode = 'screen' | 'camera' | 'both'

interface RecordingControlsProps {
  isRecording: boolean
  recordingMode: RecordingMode
  onRecordingModeChange: (mode: RecordingMode) => void
  onStartRecording: () => void
  onStopRecording: () => void
}

export function RecordingControls({ 
  isRecording,
  recordingMode,
  onRecordingModeChange,
  onStartRecording, 
  onStopRecording 
}: RecordingControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!isRecording && (
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

