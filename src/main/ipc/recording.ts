import { dialog, ipcMain } from 'electron'
import {
  appendRecordingChunk,
  finalizeStreamingRecording,
  isRecordingActive,
  startStreamingRecording,
} from '../recording'
import { updateCameraMenuState, updateMicrophoneMenuState } from '../menu'
import { libraryWindow } from '../windows'
import { tryCatchIpcMain } from './utils'

export function setupRecordingHandlers() {
  ipcMain.handle(
    'startStreamingRecording',
    tryCatchIpcMain(async (_, config: any) => {
      return await startStreamingRecording(config)
    }),
  )

  ipcMain.handle(
    'appendRecordingChunk',
    tryCatchIpcMain(async (_, chunk: ArrayBuffer) => {
      return await appendRecordingChunk(chunk)
    }),
  )

  ipcMain.handle(
    'finalizeStreamingRecording',
    tryCatchIpcMain(async () => {
      return await finalizeStreamingRecording()
    }),
  )

  ipcMain.handle(
    'requestSwitchToLibrary',
    tryCatchIpcMain(async () => {
      if (!isRecordingActive()) {
        return { allowed: true, wasRecording: false }
      }

      const response = await dialog.showMessageBox(libraryWindow, {
        type: 'warning',
        buttons: ['Cancel', 'Quit Recording'],
        defaultId: 0,
        cancelId: 0,
        title: 'Recording in Progress',
        message: 'A recording is currently in progress.',
        detail:
          'Switching to the library will stop and save your recording. Are you sure you want to continue?',
      })

      if (response.response === 1) {
        libraryWindow?.webContents.send('stop-recording-requested')
        return { allowed: true, wasRecording: true }
      }

      return { allowed: false, wasRecording: true }
    }),
  )

  ipcMain.handle(
    'updateCameraMenuState',
    tryCatchIpcMain(
      async (
        _,
        state: {
          cameras?: Array<{ id: string; label: string }>
          selectedCameraId?: string
          automaticCameraSelection?: boolean
          enableScreenFlash?: boolean
        },
      ) => {
        updateCameraMenuState(state)
      },
    ),
  )

  ipcMain.handle(
    'updateMicrophoneMenuState',
    tryCatchIpcMain(
      async (
        _,
        state: {
          microphones?: Array<{ id: string; label: string }>
          selectedMicrophoneId?: string
          automaticMicrophoneSelection?: boolean
        },
      ) => {
        updateMicrophoneMenuState(state)
      },
    ),
  )
}
