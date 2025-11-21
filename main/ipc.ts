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
import { debug } from './lib/logger'
import { getVideoDuration, transcribeVideo } from './lib/transcription'
import { VideoConverter } from './lib/videoConverter'
import { generateVideoSummary } from './lib/videoSummary'
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
  deleteVlog,
  generateLogId,
  getAllVlogs,
  getLog,
  setVlog,
  store,
  updateVlog,
} from './store'
import { getActiveRecordingsDir } from './store/default-folder'
import * as ephemeral from './store/ephemeral'
import { libraryWindow, settingsWindow, onChangeTopLevelPage } from './windows'

export const vlogIdToPath = new Map<string, string>()

// Initialize recording system

// Helper function to generate a unique ID for a vlog
function generateVlogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

// Helper function to detect if a file is audio-only
function isAudioOnlyFile(filePath: string): boolean {
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac']
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || ''

  // Check if it's an audio file extension or an "Audio Log" recording
  return audioExtensions.includes(ext) || fileName.startsWith('Audio ')
}

/**
 * Converts a persisted Log to an EnrichedLog with file system stats
 * Checks if the file exists and enriches with stats accordingly
 * @param log - The persisted Log from data.json
 */
async function enrichLog(log: Log): Promise<EnrichedLog> {
  const createdDate = new Date(log.timestamp)

  // Check if file is in default folder
  const recordingsDir = getActiveRecordingsDir()
  const defaultDir = resolve(recordingsDir)
  const fileDir = resolve(dirname(log.path))

  // Compare normalized paths (handle case sensitivity on macOS)
  const isInDefaultFolder = fileDir.toLowerCase() === defaultDir.toLowerCase()

  try {
    // Try to get file stats
    await access(log.path)
    const stats = await stat(log.path)

    return {
      id: log.id,
      name: log.name,
      title: log.title,
      path: log.path,
      size: stats.size,
      created: createdDate,
      modified: stats.mtime,
      thumbnailPath: `vlog-thumbnail://${log.id}.jpg`,
      duration: log.duration,
      summary: log.summary,
      transcription: log.transcription?.result || undefined,
      isAudioOnly: log.isAudioOnly,
      fileExists: true,
      isInDefaultFolder,
    }
  } catch (error) {
    // File doesn't exist, return with missing file indicator
    return {
      id: log.id,
      name: log.name,
      title: log.title,
      path: log.path,
      size: 0,
      created: createdDate,
      modified: createdDate, // Fallback to created date
      thumbnailPath: `vlog-thumbnail://${log.id}.jpg`,
      duration: log.duration,
      summary: log.summary,
      transcription: log.transcription?.result || undefined,
      isAudioOnly: log.isAudioOnly,
      fileExists: false,
      isInDefaultFolder,
    }
  }
}

/**
 * Gets an enriched log by ID
 */
async function getEnrichedLog(vlogId: string): Promise<EnrichedLog | null> {
  const log = getLog(vlogId)
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

  ipcMain.handle('getState', async () => {
    return store.store
  })

  ipcMain.handle('setPartialState', async (_, state: Partial<State>) => {
    store.set(state)
  })

  ipcMain.handle(
    'getEnrichedLogs',
    tryCatchIpcMain(async () => {
      const documentsPath = getActiveRecordingsDir()

      await mkdir(documentsPath, { recursive: true })

      const storedVlogs = getAllVlogs()

      debug(`Found ${Object.keys(storedVlogs).length} logs in store`)
      const enrichedLogs = await Promise.all(
        Object.entries(storedVlogs).map(async ([id, log]) => {
          debug(`Processing log: ${log.path}`)

          vlogIdToPath.set(id, log.path)

          return enrichLog(log)
        }),
      )

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
    tryCatchIpcMain(async (_, vlogId: string) => {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }
      await shell.showItemInFolder(filePath)
    }),
  )

  ipcMain.handle(
    'untrackVlog',
    tryCatchIpcMain(async (_, vlogId: string) => {
      deleteVlog(vlogId)
      vlogIdToPath.delete(vlogId)
      return true
    }),
  )

  //
  //
  //
  //

  ipcMain.handle('startStreamingRecording', async (_, config: any) => {
    return startStreamingRecording(config)
  })

  ipcMain.handle('appendRecordingChunk', async (_, chunk: ArrayBuffer) => {
    return appendRecordingChunk(chunk)
  })

  ipcMain.handle('finalizeStreamingRecording', async () => {
    return finalizeStreamingRecording()
  })

  //
  //
  //
  //

  // Store handlers
  ipcMain.handle('storeGet', (_, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('storeSet', (_, key: string, value: any) => {
    store.set(key, value)
  })

  ipcMain.handle(
    'transcribeVideo',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      ephemeral.setTranscriptionProgress(vlogId, 0)

      const speedUp = store.get('transcriptionSpeedUp') || false

      try {
        const result = await transcribeVideo(filePath, speedUp, (progress) => {
          ephemeral.setTranscriptionProgress(vlogId, Math.round(progress))
          libraryWindow?.webContents.send(
            'transcription-progress-updated',
            vlogId,
            Math.round(progress),
          )
        })

        ephemeral.removeTranscription(vlogId)

        updateVlog(vlogId, {
          transcription: {
            status: 'completed',
            result,
          },
        })

        try {
          const summary = await generateVideoSummary(vlogId, result.text)
          updateVlog(vlogId, { summary })
          libraryWindow?.webContents.send('summary-generated', vlogId, summary)
        } catch (summaryError) {
          console.error('Error generating automatic summary:', summaryError)
        }

        return result
      } catch (error) {
        ephemeral.removeTranscription(vlogId)

        const errorState = {
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        updateVlog(vlogId, { transcription: errorState })

        throw error
      }
    }),
  )

  ipcMain.handle(
    'getTranscription',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const vlog = getLog(vlogId)
      if (!vlog || !vlog.transcription) {
        return null
      }
      // Return the TranscriptionResult, not the TranscriptionState
      if (
        vlog.transcription.status === 'completed' &&
        vlog.transcription.result
      ) {
        return vlog.transcription.result
      }
      return null
    }),
  )

  ipcMain.handle(
    'getTranscriptionState',
    tryCatchIpcMain(async (_, vlogId: string) => {
      if (ephemeral.isTranscriptionActive(vlogId)) {
        const progress = ephemeral.getTranscriptionProgress(vlogId)
        return {
          status: 'transcribing',
          progress: progress ?? 0,
        }
      }

      const vlog = getLog(vlogId)
      if (vlog?.transcription) {
        return {
          status: 'completed',
          result: vlog.transcription,
        }
      }

      return { status: 'idle' }
    }),
  )

  ipcMain.handle(
    'loadVideoDuration',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const vlog = getLog(vlogId)
      if (!vlog) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      if (vlog.duration !== undefined) {
        return vlog.duration
      }

      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`File path not found for vlog ${vlogId}`)
      }

      const duration = await getVideoDuration(filePath)

      if (duration) {
        updateVlog(vlogId, { duration })
      }

      return duration
    }),
  )

  ipcMain.handle(
    'transcribeNextFive',
    tryCatchIpcMain(async () => {
      const allVlogs = getAllVlogs()
      const vlogEntries = Object.entries(allVlogs)

      // Find vlogs that need transcription
      const needsTranscription = vlogEntries.filter(([vlogId, vlog]) => {
        // Skip if already transcribing
        if (ephemeral.isTranscriptionActive(vlogId)) {
          return false
        }

        // Skip if file doesn't exist
        const filePath = vlogIdToPath.get(vlogId)
        if (!filePath) {
          return false
        }

        // Check if transcription is missing or incomplete
        if (!vlog.transcription) {
          return true
        }

        if (vlog.transcription.status !== 'completed') {
          return true
        }

        return false
      })

      // Take up to 5, sorted by creation date (oldest first)
      const toTranscribe = needsTranscription
        .sort(([, a], [, b]) => {
          const dateA = new Date(a.timestamp).getTime()
          const dateB = new Date(b.timestamp).getTime()
          return dateA - dateB
        })
        .slice(0, 5)
        .map(([vlogId]) => vlogId)

      const speedUp = store.get('transcriptionSpeedUp') || false

      // Start transcribing each one (fire and forget)
      for (const vlogId of toTranscribe) {
        const filePath = vlogIdToPath.get(vlogId)
        if (!filePath) {
          continue
        }

        ephemeral.setTranscriptionProgress(vlogId, 0)

        // Don't await - let them run in parallel
        transcribeVideo(filePath, speedUp, (progress) => {
          ephemeral.setTranscriptionProgress(vlogId, Math.round(progress))
          libraryWindow?.webContents.send(
            'transcription-progress-updated',
            vlogId,
            Math.round(progress),
          )
        })
          .then((result) => {
            ephemeral.removeTranscription(vlogId)

            updateVlog(vlogId, {
              transcription: {
                status: 'completed',
                result,
              },
            })

            // Generate summary asynchronously
            generateVideoSummary(vlogId, result.text)
              .then((summary) => {
                updateVlog(vlogId, { summary })
                libraryWindow?.webContents.send(
                  'summary-generated',
                  vlogId,
                  summary,
                )
              })
              .catch((summaryError) => {
                console.error(
                  'Error generating automatic summary:',
                  summaryError,
                )
              })
          })
          .catch((error) => {
            ephemeral.removeTranscription(vlogId)

            const errorState = {
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
            updateVlog(vlogId, { transcription: errorState })

            console.error(`Failed to transcribe ${vlogId}:`, error)
          })
      }

      return {
        started: toTranscribe.length,
        total: needsTranscription.length,
      }
    }),
  )

  ipcMain.handle(
    'onViewLogEntry',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const vlog = getLog(vlogId)
      if (!vlog) {
        return
      }

      // Auto-load duration if not present
      if (vlog.duration === undefined) {
        const filePath = vlogIdToPath.get(vlogId)
        if (filePath) {
          const duration = await getVideoDuration(filePath)
          if (duration) {
            updateVlog(vlogId, { duration })
          }
        }
      }

      // Auto-trigger transcription if not present or idle
      if (!vlog.transcription || vlog.transcription.status === 'idle') {
        const filePath = vlogIdToPath.get(vlogId)
        if (filePath && !ephemeral.isTranscriptionActive(vlogId)) {
          // Trigger transcription asynchronously (don't block)
          const speedUp = store.get('transcriptionSpeedUp') || false

          transcribeVideo(filePath, speedUp, (progress) => {
            ephemeral.setTranscriptionProgress(vlogId, Math.round(progress))
            libraryWindow?.webContents.send(
              'transcription-progress-updated',
              vlogId,
              Math.round(progress),
            )
          })
            .then((result) => {
              ephemeral.removeTranscription(vlogId)

              updateVlog(vlogId, {
                transcription: {
                  status: 'completed',
                  result,
                },
              })

              // Generate summary asynchronously
              generateVideoSummary(vlogId, result.text)
                .then((summary) => {
                  updateVlog(vlogId, { summary })
                  libraryWindow?.webContents.send(
                    'summary-generated',
                    vlogId,
                    summary,
                  )
                })
                .catch((summaryError) => {
                  console.error(
                    'Error generating automatic summary:',
                    summaryError,
                  )
                })
            })
            .catch((error) => {
              ephemeral.removeTranscription(vlogId)

              const errorState = {
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
              updateVlog(vlogId, { transcription: errorState })
            })
        }
      }
    }),
  )

  ipcMain.handle(
    'getVlog',
    tryCatchIpcMain(async (_, vlogId: string) => {
      return getLog(vlogId)
    }),
  )

  ipcMain.handle(
    'getEnrichedLog',
    tryCatchIpcMain(async (_, vlogId: string) => {
      return await getEnrichedLog(vlogId)
    }),
  )

  ipcMain.handle(
    'updateVlog',
    tryCatchIpcMain(async (_, vlogId: string, updates: Partial<Log>) => {
      updateVlog(vlogId, updates)
      return true
    }),
  )

  // Transcription settings handlers

  // Summary handlers

  ipcMain.handle(
    'generateVideoSummary',
    tryCatchIpcMain(async (_, vlogId: string, transcription: string) => {
      const summary = await generateVideoSummary(vlogId, transcription)
      updateVlog(vlogId, { summary })
      return summary
    }),
  )

  ipcMain.handle(
    'importVideoFile',
    tryCatchIpcMain(async (_, filePath: string) => {
      await access(filePath)

      const stats = await stat(filePath)
      const fileName =
        filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

      const id = generateLogId(filePath)

      const existingLog = getLog(id)
      if (existingLog) {
        return {
          success: false,
          isDuplicate: true,
          message: `"${fileName}" is already in your library`,
          existingVlog: await enrichLog(existingLog),
        }
      }

      vlogIdToPath.set(id, filePath)

      let createdDate: Date

      // Check if this is an iPhone video file
      if (isIPhoneVideoFilename(fileName)) {
        debug(`Detected iPhone video: ${fileName}`)

        const metadata = await extractVideoMetadata(filePath)

        if (metadata.creationDate) {
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
            vlogIdToPath.delete(id)
            return {
              success: false,
              isDuplicate: false,
              message: `Import cancelled`,
            }
          }

          createdDate = metadata.creationDate
          debug(`Using metadata date for ${fileName}: ${createdDate}`)
        } else {
          throw new Error(
            `Could not extract creation date from iPhone video metadata for: "${fileName}"`,
          )
        }
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
      setVlog(log)

      debug(`Imported video file: ${filePath}`)
      return {
        success: true,
        isDuplicate: false,
        message: `Successfully imported "${fileName}"`,
        vlog: await enrichLog(log),
      }
    }),
  )

  ipcMain.handle(
    'saveVideoPosition',
    tryCatchIpcMain(async (_, vlogId: string, position: number) => {
      const now = new Date().toISOString()
      updateVlog(vlogId, {
        lastPosition: position,
        lastPositionTimestamp: now,
      })
      return true
    }),
  )

  ipcMain.handle(
    'getVideoPosition',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const vlog = getLog(vlogId)
      if (!vlog) {
        return null
      }

      if (vlog.lastPositionTimestamp) {
        const lastPositionTime = new Date(vlog.lastPositionTimestamp)
        const now = new Date()
        const timeDiff = now.getTime() - lastPositionTime.getTime()
        const thirtyMinutes = 30 * 60 * 1000

        if (timeDiff < thirtyMinutes && vlog.lastPosition !== undefined) {
          return {
            position: vlog.lastPosition,
            timestamp: vlog.lastPositionTimestamp,
          }
        }
      }

      return null
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
    tryCatchIpcMain(async (_, vlogId: string) => {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
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
        if (err.code !== 'ENOENT') {
          throw err
        }
      }

      ephemeral.setConversionProgress(vlogId, 0)

      try {
        await VideoConverter.convertToMP4(filePath, outputPath, (progress) => {
          ephemeral.setConversionProgress(vlogId, progress)
          libraryWindow?.webContents.send(
            'conversion-progress',
            vlogId,
            progress,
          )
        })

        ephemeral.removeConversion(vlogId)

        const stats = await stat(outputPath)
        const fileName =
          outputPath.split('/').pop() ||
          outputPath.split('\\').pop() ||
          'unknown'
        const id = generateLogId(outputPath)

        const originalVlog = getLog(vlogId)
        const timestamp = originalVlog?.timestamp || new Date().toISOString()

        vlogIdToPath.set(id, outputPath)

        const vlog: Log = {
          id,
          name: fileName,
          path: outputPath,
          timestamp: timestamp,
        }
        setVlog(vlog)

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
            await shell.trashItem(filePath)
            deleteVlog(vlogId)
            vlogIdToPath.delete(vlogId)
            debug(`Moved original WebM to trash: ${filePath}`)
          } catch (trashError) {
            console.error('Failed to move original file to trash:', trashError)
          }
        }

        return {
          success: true,
          message: `Successfully converted to MP4`,
          newVlogId: id,
          outputPath: outputPath,
        }
      } catch (error) {
        ephemeral.removeConversion(vlogId)
        throw error
      }
    }),
  )

  // Get conversion state
  ipcMain.handle('getConversionState', async (_, vlogId: string) => {
    return {
      isActive: ephemeral.isConversionActive(vlogId),
      progress: ephemeral.getConversionProgress(vlogId),
    }
  })

  ipcMain.handle(
    'moveToDefaultFolder',
    tryCatchIpcMain(async (_, vlogId: string) => {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
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
        if (err.code !== 'ENOENT') {
          throw err
        }
      }

      await copyFile(filePath, newPath)

      debug(`Copied video to recordings folder: ${newPath}`)

      vlogIdToPath.set(vlogId, newPath)
      updateVlog(vlogId, { path: newPath, name: fileName })

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
          await shell.trashItem(filePath)
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
  ipcMain.handle('onChangeTopLevelPage', (_, page: 'library' | 'record') => {
    onChangeTopLevelPage(page)
  })

  // Set up state change listener
  store.onDidAnyChange((state) => {
    // Ensure we only send serializable data
    const serializableState = JSON.parse(JSON.stringify(state))
    libraryWindow?.webContents.send('state-changed', serializableState)
  })

  // Broadcast electron-store vlog changes to all renderer windows
  store.onDidChange(
    'vlogs',
    (
      newVlogs: Record<string, any> = {},
      oldVlogs: Record<string, any> = {},
    ) => {
      console.log('vlogs changed')

      try {
        const changedIds = new Set<string>()
        for (const id of Object.keys(newVlogs || {})) {
          const before = oldVlogs ? oldVlogs[id] : undefined
          const after = newVlogs[id]
          if (!before || JSON.stringify(before) !== JSON.stringify(after)) {
            changedIds.add(id)
          }
        }
        // Also include ids that were removed if needed in future
        // for now, we only emit updates for added/modified vlogs as requested

        if (changedIds.size === 0) {
          return
        }

        BrowserWindow.getAllWindows().forEach((window) => {
          if (!window.isDestroyed()) {
            changedIds.forEach((id) => {
              console.log('sending vlog-updated', id)

              window.webContents.send('vlog-updated', id)
            })
          }
        })
      } catch (error) {
        console.error('Error broadcasting vlog-updated:', error)
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
