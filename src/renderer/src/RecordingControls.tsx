import React from 'react'

interface RecordingControlsProps {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export function RecordingControls({
  isRecording,
  onStartRecording,
  onStopRecording
}: RecordingControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {isRecording ? (
        <>
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            <span>Recording...</span>
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
          🔴 Start Recording
        </button>
      )}
    </div>
  )
}

