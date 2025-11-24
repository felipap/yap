import { createHash } from 'crypto'
import {
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  shell,
} from 'electron'
import { access, copyFile, mkdir, rename, stat } from 'fs/promises'
import { dirname, join, basename, resolve } from 'path'
import { State, Log, EnrichedLog } from '../shared-types'
import { extractDateFromTitle } from './ai/date-from-title'
import { getDefaultRecordingsDir, getRecordingsDir } from './lib/config'
import { moveToTrash } from './lib/filesystem'
import { debug } from './lib/logger'
import { getVideoDuration, transcribeVideo } from './lib/transcription'
import { VideoConverter } from './lib/videoConverter'
import { generateVideoSummary } from './ai/summarize-transcript'
import {
  extractVideoMetadata,
  formatDateForPrompt,
  isIPhoneVideoFilename,
  parseDateFromPrompt,
} from './lib/video-metadata'
import {
  appendRecordingChunk,
  finalizeStreamingRecording,
  startStreamingRecording,
} from './recording'
import {
  deleteLog,
  generateLogId,
  getAllLogs,
  getLog,
  setLog,
  store,
  updateLog,
} from './store'
import { getActiveRecordingsDir } from './store/default-folder'
import * as ephemeral from './store/ephemeral'
import { libraryWindow, settingsWindow, onChangeTopLevelPage } from './windows'

export const logIdToPath = new Map<string, string>()

// Initialize recording system

// Helper function to detect if a file is audio-only
function isAudioOnlyFile(filePath: string): boolean {
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac']
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || ''

  // Check if it's an audio file extension or an "Audio Log" recording
  return audioExtensions.includes(ext) || fileName.startsWith('Audio ')
}

/**
 * Gets an enriched log by ID
 */
async function getEnrichedLog(logId: string): Promise<EnrichedLog | null> {
  const log = getLog(logId)
  if (!log) {
    return null
  }
  return await enrichLog(log)
}

// IPC handlers
export function setupIpcHandlers() {
  ipcMain.handle(
    'getScreenSources',
    tryCatchIpcMain(async () => {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
      })
      return sources
    }),
  )

  ipcMain.handle(
    'getState',
    tryCatchIpcMain(async () => {
      return store.store
    }),
  )

  ipcMain.handle(
    'setPartialState',
    tryCatchIpcMain(async (_, state: Partial<State>) => {
      store.set(state)
    }),
  )

  ipcMain.handle(
    'getEnrichedLogs',
    tryCatchIpcMain(async () => {
      // const documentsPath = getActiveRecordingsDir()
      // await mkdir(documentsPath, { recursive: true })

      const storedLogs = getAllLogs()

      debug(`Found ${Object.keys(storedLogs).length} logs in store`)

      const start = Date.now()
      const enrichedLogs = await Promise.all(
        Object.entries(storedLogs).map(async ([id, log]) => {
          // debug(`Processing log: ${log.path}`)

          logIdToPath.set(id, log.path)

          return enrichLog(log)
        }),
      )
      const end = Date.now()
      console.log(`Time taken: ${end - start}ms`)

      const sortedEnrichedLogs = enrichedLogs.sort(
        (a, b) => b.created.getTime() - a.created.getTime(),
      )

      debug(
        `Returning ${sortedEnrichedLogs.length} enriched logs (including missing files)`,
      )
      return sortedEnrichedLogs
    }),
  )

  ipcMain.handle(
    'openFileLocation',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = logIdToPath.get(logId)
      if (!filePath) {
        throw new Error(`Log with ID ${logId} not found`)
      }
      await shell.showItemInFolder(filePath)
    }),
  )

  ipcMain.handle(
    'untrackLog',
    tryCatchIpcMain(async (_, logId: string) => {
      deleteLog(logId)
      logIdToPath.delete(logId)
      return true
    }),
  )

  //
  //
  //
  //

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

  //
  //
  //
  //

  // Store handlers
  ipcMain.handle(
    'storeGet',
    tryCatchIpcMain((_, key: string) => {
      return store.get(key)
    }),
  )

  ipcMain.handle(
    'storeSet',
    tryCatchIpcMain(async (_, key: string, value: any) => {
      store.set(key, value)
    }),
  )

  ipcMain.handle(
    'transcribeVideo',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = logIdToPath.get(logId)
      if (!filePath) {
        throw new Error(`Log with ID ${logId} not found`)
      }

      ephemeral.setTranscriptionProgress(logId, 0)

      const speedUp = store.get('transcriptionSpeedUp') || false
      const openaiApiKey = store.get('openaiApiKey') || null

      if (!openaiApiKey) {
        throw new Error('OpenAI API key is not set')
      }

      try {
        const result = await transcribeVideo(
          filePath,
          openaiApiKey,
          speedUp,
          (progress) => {
            ephemeral.setTranscriptionProgress(logId, Math.round(progress))
            libraryWindow?.webContents.send(
              'transcription-progress-updated',
              logId,
              Math.round(progress),
            )
          },
        )

        ephemeral.removeTranscription(logId)

        updateLog(logId, {
          transcription: {
            status: 'completed',
            result,
          },
        })

        try {
          const summary = await generateVideoSummary(logId, result.text)
          // Only update if summary is not empty (don't set summary field for "nothing to transcribe")
          if (summary) {
            updateLog(logId, { summary })
            libraryWindow?.webContents.send('summary-generated', logId, summary)
          }
        } catch (summaryError) {
          console.error('Error generating automatic summary:', summaryError)
        }

        return result
      } catch (error) {
        ephemeral.removeTranscription(logId)

        const errorState = {
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        updateLog(logId, { transcription: errorState })

        throw error
      }
    }),
  )

  ipcMain.handle(
    'getTranscription',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log || !log.transcription) {
        return null
      }
      // Return the TranscriptionResult, not the TranscriptionState
      if (
        log.transcription.status !== 'completed' ||
        !log.transcription.result
      ) {
        return null
      }
      return log.transcription.result
    }),
  )

  ipcMain.handle(
    'getTranscriptionState',
    tryCatchIpcMain(async (_, logId: string) => {
      if (ephemeral.isTranscriptionActive(logId)) {
        const progress = ephemeral.getTranscriptionProgress(logId)
        return {
          status: 'transcribing',
          progress: progress ?? 0,
        }
      }

      const log = getLog(logId)
      if (log?.transcription) {
        return {
          status: 'completed',
          result: log.transcription,
        }
      }

      return { status: 'idle' }
    }),
  )

  // Helper function to start transcription and generate summary asynchronously
  async function startTranscriptionAndSummary(logId: string, filePath: string) {
    const speedUp = store.get('transcriptionSpeedUp') || false
    const openaiApiKey = store.get('openaiApiKey') || null

    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not set')
    }

    try {
      const result = await transcribeVideo(
        filePath,
        openaiApiKey,
        speedUp,
        (progress) => {
          ephemeral.setTranscriptionProgress(logId, Math.round(progress))
          libraryWindow?.webContents.send(
            'transcription-progress-updated',
            logId,
            Math.round(progress),
          )
        },
      )

      ephemeral.removeTranscription(logId)

      updateLog(logId, {
        transcription: {
          status: 'completed',
          result,
        },
      })

      // Generate summary asynchronously
      try {
        const summary = await generateVideoSummary(logId, result.text)
        // Only update if summary is not empty (don't set summary field for "nothing to transcribe")
        if (summary) {
          updateLog(logId, { summary })
          libraryWindow?.webContents.send('summary-generated', logId, summary)
        }
      } catch (summaryError) {
        console.error('Error generating automatic summary:', summaryError)
      }
    } catch (error) {
      ephemeral.removeTranscription(logId)

      const errorState = {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      updateLog(logId, { transcription: errorState })
    }
  }

  ipcMain.handle(
    'onViewLogEntry',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        return { error: 'Log not found' }
      }

      const filePath = logIdToPath.get(logId)

      // Auto-load duration if not present
      if (log.duration === undefined && filePath) {
        try {
          const duration = await getVideoDuration(filePath)
          if (duration) {
            updateLog(logId, { duration })
          }
        } catch (error) {
          // File may be in cloud storage or not accessible
          // Log the error but don't fail the entire operation
          console.warn(`Failed to get video duration for ${logId}:`, error)
        }
      }

      // Auto-trigger transcription if not present or idle
      const needsTranscription =
        (!log.transcription || log.transcription.status === 'idle') &&
        filePath &&
        !ephemeral.isTranscriptionActive(logId)

      if (needsTranscription) {
        // Trigger transcription asynchronously (don't block)
        startTranscriptionAndSummary(logId, filePath)
      }
    }),
  )

  ipcMain.handle(
    'getLog',
    tryCatchIpcMain(async (_, logId: string) => {
      return getLog(logId)
    }),
  )

  ipcMain.handle(
    'getEnrichedLog',
    tryCatchIpcMain(async (_, logId: string) => {
      return await getEnrichedLog(logId)
    }),
  )

  ipcMain.handle(
    'updateLog',
    tryCatchIpcMain(async (_, logId: string, updates: Partial<Log>) => {
      updateLog(logId, updates)
      return true
    }),
  )

  // Summary handlers

  ipcMain.handle(
    'generateVideoSummary',
    tryCatchIpcMain(async (_, logId: string, transcription: string) => {
      const summary = await generateVideoSummary(logId, transcription)
      // Only update if summary is not empty (don't set summary field for "nothing to transcribe")
      if (summary) {
        updateLog(logId, { summary })
      }
      return summary
    }),
  )

  ipcMain.handle(
    'importVideoFile',
    tryCatchIpcMain(async (_, filePath: string) => {
      await access(filePath)

      const fileName =
        filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

      const id = generateLogId(filePath)

      const existingLog = getLog(id)
      if (existingLog) {
        return {
          success: false,
          isDuplicate: true,
          message: `"${fileName}" is already in your library`,
          existingLog: await enrichLog(existingLog),
        }
      }

      logIdToPath.set(id, filePath)

      let createdDate: Date

      // Check if this is an iPhone video file
      if (isIPhoneVideoFilename(fileName)) {
        debug(`Detected iPhone video: ${fileName}`)

        const metadata = await extractVideoMetadata(filePath)

        if (!metadata.creationDate) {
          throw new Error(
            `Could not extract creation date from iPhone video metadata for: "${fileName}"`,
          )
        }

        const formattedDate = formatDateForPrompt(metadata.creationDate)

        const response = await dialog.showMessageBox(libraryWindow, {
          type: 'question',
          buttons: ['Cancel', 'Use This Date'],
          defaultId: 1,
          cancelId: 0,
          title: 'Confirm Video Date',
          message: `iPhone video: ${fileName}`,
          detail: `Date found: ${formattedDate}\n\nClick "Use This Date" to confirm, or "Cancel" to skip this video.\n\n(Note: Date format is YYYY-MM-DD HH:MM)`,
        })

        if (response.response === 0) {
          debug(`User cancelled import for ${fileName}`)
          logIdToPath.delete(id)
          return {
            success: false,
            isDuplicate: false,
            message: `Import cancelled`,
          }
        }

        createdDate = metadata.creationDate
        debug(`Using metadata date for ${fileName}: ${createdDate}`)
      } else {
        // Use the existing date extraction from title for non-iPhone videos
        const dateResult = await extractDateFromTitle(fileName)
        if ('error' in dateResult) {
          throw new Error(
            `Could not extract date from filename: "${fileName}". Error: ${dateResult.error}`,
          )
        }
        if (dateResult.confidence === 'low') {
          throw new Error(
            `Could not extract date from filename: "${fileName}". Please ensure the filename contains a date in a recognizable format.`,
          )
        }

        createdDate = new Date(
          dateResult.year,
          dateResult.month - 1,
          dateResult.day,
          dateResult.hour,
          dateResult.minute,
          0,
          0,
        )
      }

      const log: Log = {
        id,
        name: fileName,
        path: filePath,
        timestamp: createdDate.toISOString(),
        isAudioOnly: isAudioOnlyFile(filePath),
      }
      setLog(log)

      debug(`Imported video file: ${filePath}`)
      return {
        success: true,
        isDuplicate: false,
        message: `Successfully imported "${fileName}"`,
        log: await enrichLog(log),
      }
    }),
  )

  ipcMain.handle(
    'saveVideoPosition',
    tryCatchIpcMain(async (_, logId: string, position: number) => {
      const now = new Date().toISOString()
      updateLog(logId, {
        lastPosition: position,
        lastPositionTimestamp: now,
      })
      return true
    }),
  )

  ipcMain.handle(
    'getVideoPosition',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        return null
      }

      if (!log.lastPositionTimestamp) {
        return null
      }

      const lastPositionTime = new Date(log.lastPositionTimestamp)
      const now = new Date()
      const timeDiff = now.getTime() - lastPositionTime.getTime()
      const thirtyMinutes = 30 * 60 * 1000

      if (timeDiff >= thirtyMinutes || log.lastPosition === undefined) {
        return null
      }

      return {
        position: log.lastPosition,
        timestamp: log.lastPositionTimestamp,
      }
    }),
  )

  // Auto-updater handlers

  ipcMain.handle(
    'openSettingsWindow',
    tryCatchIpcMain(async () => {
      settingsWindow?.show()
      return { success: true, windowId: settingsWindow?.id || 0 }
    }),
  )

  ipcMain.handle(
    'hideSettingsWindow',
    tryCatchIpcMain(async () => {
      settingsWindow?.hide()
    }),
  )

  ipcMain.handle(
    'getGeminiApiKey',
    tryCatchIpcMain(async () => {
      return store.get('geminiApiKey') || ''
    }),
  )

  ipcMain.handle(
    'setGeminiApiKey',
    tryCatchIpcMain(async (_, apiKey: string) => {
      store.set('geminiApiKey', apiKey)
      return true
    }),
  )

  ipcMain.handle(
    'getUserContext',
    tryCatchIpcMain(async () => {
      return store.get('userContext') || ''
    }),
  )

  ipcMain.handle(
    'setUserContext',
    tryCatchIpcMain(async (_, userContext: string) => {
      store.set('userContext', userContext)
      return true
    }),
  )

  ipcMain.handle(
    'getRecordingsFolder',
    tryCatchIpcMain(async () => {
      return getActiveRecordingsDir()
    }),
  )

  ipcMain.handle(
    'openFolderPicker',
    tryCatchIpcMain(async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Recordings Folder',
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    }),
  )

  ipcMain.handle(
    'convertToMp4',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = logIdToPath.get(logId)
      if (!filePath) {
        throw new Error(`Log with ID ${logId} not found`)
      }

      if (
        !filePath.toLowerCase().endsWith('.webm') &&
        !filePath.toLowerCase().endsWith('.mov')
      ) {
        throw new Error('Only WebM and MOV files can be converted to MP4')
      }

      const outputPath = filePath
        .replace(/\.webm$/i, '.mp4')
        .replace(/\.mov$/i, '.mp4')

      try {
        await access(outputPath)
        throw new Error('MP4 file already exists')
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, which is what we want - continue
        } else {
          throw err
        }
      }

      ephemeral.setConversionProgress(logId, 0)

      try {
        await VideoConverter.convertToMP4(filePath, outputPath, (progress) => {
          ephemeral.setConversionProgress(logId, progress)
          libraryWindow?.webContents.send(
            'conversion-progress',
            logId,
            progress,
          )
        })

        ephemeral.removeConversion(logId)

        const stats = await stat(outputPath)
        const fileName =
          outputPath.split('/').pop() ||
          outputPath.split('\\').pop() ||
          'unknown'
        const id = generateLogId(outputPath)

        const originalLog = getLog(logId)
        const timestamp = originalLog?.timestamp || new Date().toISOString()

        logIdToPath.set(id, outputPath)

        const log: Log = {
          id,
          name: fileName,
          path: outputPath,
          timestamp: timestamp,
          title: originalLog?.title,
          transcription: originalLog?.transcription,
          summary: originalLog?.summary,
        }
        setLog(log)

        debug(`Converted video to MP4: ${outputPath}`)

        const originalFileName =
          filePath.split('/').pop() || filePath.split('\\').pop() || 'file'
        const response = await dialog.showMessageBox(libraryWindow, {
          type: 'question',
          buttons: ['Keep Original', 'Move to Trash'],
          defaultId: 1,
          title: 'Delete Original File?',
          message: 'Conversion complete!',
          detail: `Do you want to move the original WebM file "${originalFileName}" to trash? The new MP4 file has been created.`,
        })

        if (response.response === 1) {
          try {
            await moveToTrash(filePath)
            deleteLog(logId)
            logIdToPath.delete(logId)
            debug(`Moved original WebM to trash: ${filePath}`)
          } catch (trashError) {
            console.error('Failed to move original file to trash:', trashError)
          }
        }

        return {
          success: true,
          message: `Successfully converted to MP4`,
          newLogId: id,
          outputPath: outputPath,
        }
      } catch (error) {
        ephemeral.removeConversion(logId)
        throw error
      }
    }),
  )

  // Get conversion state
  ipcMain.handle(
    'getConversionState',
    tryCatchIpcMain(async (_, logId: string) => {
      return {
        isActive: ephemeral.isConversionActive(logId),
        progress: ephemeral.getConversionProgress(logId),
      }
    }),
  )

  ipcMain.handle(
    'moveToDefaultFolder',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = logIdToPath.get(logId)
      if (!filePath) {
        throw new Error(`Log with ID ${logId} not found`)
      }

      const recordingsDir = getActiveRecordingsDir()
      const fileName = basename(filePath)
      const newPath = join(recordingsDir, fileName)

      const currentDir = resolve(dirname(filePath))
      const targetDir = resolve(recordingsDir)
      if (currentDir.toLowerCase() === targetDir.toLowerCase()) {
        return {
          success: false,
          message: 'File is already in the recordings folder',
        }
      }

      await mkdir(recordingsDir, { recursive: true })

      try {
        await access(newPath)
        throw new Error(
          `A file named "${fileName}" already exists in the recordings folder`,
        )
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, which is what we want - continue
        } else {
          throw err
        }
      }

      await copyFile(filePath, newPath)

      debug(`Copied video to recordings folder: ${newPath}`)

      logIdToPath.set(logId, newPath)
      updateLog(logId, { path: newPath, name: fileName })

      const response = await dialog.showMessageBox(libraryWindow, {
        type: 'question',
        buttons: ['Move to Trash', 'Keep Original'],
        defaultId: 0,
        title: 'Delete original file?',
        message: 'File copied successfully!',
        detail: `The file has been copied to the recordings folder. Do you want to move the original file to trash?`,
      })

      if (response.response === 1) {
        try {
          await moveToTrash(filePath)
          debug(`Moved original file to trash: ${filePath}`)
        } catch (trashError) {
          console.error('Failed to move original file to trash:', trashError)
        }
      }

      return {
        success: true,
        message: `Successfully copied to recordings folder`,
        newPath: newPath,
      }
    }),
  )

  // Window resizing for Record view
  ipcMain.handle(
    'onChangeTopLevelPage',
    tryCatchIpcMain(async (_, page: 'library' | 'record') => {
      onChangeTopLevelPage(page)
    }),
  )

  // Set up state change listener
  store.onDidAnyChange((state) => {
    // Ensure we only send serializable data
    const serializableState = JSON.parse(JSON.stringify(state))
    libraryWindow?.webContents.send('state-changed', serializableState)
  })

  // Broadcast electron-store log changes to all renderer windows
  store.onDidChange(
    'logs',
    (newLogs: Record<string, any> = {}, oldLogs: Record<string, any> = {}) => {
      console.log('logs changed')

      try {
        const changedIds = new Set<string>()
        for (const id of Object.keys(newLogs || {})) {
          const before = oldLogs ? oldLogs[id] : undefined
          const after = newLogs[id]
          if (!before || JSON.stringify(before) !== JSON.stringify(after)) {
            changedIds.add(id)
          }
        }
        // Also include ids that were removed if needed in future
        // for now, we only emit updates for added/modified logs as requested

        if (changedIds.size === 0) {
          return
        }

        BrowserWindow.getAllWindows().forEach((window) => {
          if (!window.isDestroyed()) {
            changedIds.forEach((id) => {
              console.log('sending log-updated', id)

              window.webContents.send('log-updated', id)
            })
          }
        })
      } catch (error) {
        console.error('Error broadcasting log-updated:', error)
      }
    },
  )
}

function tryCatchIpcMain(handler: (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('Error in IPC handler:', error)
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }
}

// Converts a persisted Log to an EnrichedLog with file system stats
// Checks if the file exists and enriches with stats accordingly
// @param log - The persisted Log from data.json
async function enrichLog(log: Log): Promise<EnrichedLog> {
  const createdDate = new Date(log.timestamp)

  // Check if file is in default folder
  const recordingsDir = getActiveRecordingsDir()
  const defaultDir = resolve(recordingsDir)
  const fileDir = resolve(dirname(log.path))

  // Compare normalized paths (handle case sensitivity on macOS)
  const isInDefaultFolder = fileDir.toLowerCase() === defaultDir.toLowerCase()

  // try {
  //   // Try to get file stats
  //   await access(log.path)
  //   const stats = await stat(log.path)

  return {
    id: log.id,
    name: log.name,
    title: log.title,
    path: log.path,
    // size: 0,
    created: createdDate,
    // modified: createdDate,
    thumbnailPath: `log-thumbnail://${log.id}.jpg`,
    duration: log.duration,
    summary: log.summary,
    transcription: log.transcription?.result || undefined,
    isAudioOnly: log.isAudioOnly,
    fileExists: true,
    isInDefaultFolder,
  }
  // } catch (error) {
  //   // File doesn't exist, return with missing file indicator
  //   return {
  //     id: log.id,
  //     name: log.name,
  //     title: log.title,
  //     path: log.path,
  //     size: 0,
  //     created: createdDate,
  //     modified: createdDate, // Fallback to created date
  //     thumbnailPath: `log-thumbnail://${log.id}.jpg`,
  //     duration: log.duration,
  //     summary: log.summary,
  //     transcription: log.transcription?.result || undefined,
  //     isAudioOnly: log.isAudioOnly,
  //     fileExists: false,
  //     isInDefaultFolder,
  //   }
  // }
}
