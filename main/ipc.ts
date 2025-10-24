import { createHash } from 'crypto'
import { app, BrowserWindow, desktopCapturer, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'fs/promises'
import { join } from 'path'
import { State, UserProfile, Vlog } from '../shared-types'
import { extractDateFromTitle } from './ai/date-from-title'
import { FILE_PATTERNS, getRecordingsDir, getTempDir } from './lib/config'
import { debug } from './lib/logger'
import { getVideoDuration, transcribeVideo } from './lib/transcription'
import { VideoConverter } from './lib/videoConverter'
import { generateVideoSummary } from './lib/videoSummary'
import {
  emergencySave,
  getRecordingState,
  startRecording,
  stopRecording,
} from './recording'
import {
  appendRecordingChunk,
  finalizeStreamingRecording,
  startStreamingRecording,
} from './recording/background-recording'
import { RecordingConfig } from './recording/types'
import {
  deleteVlog,
  getAllVlogs,
  getVlog,
  setVlog,
  store,
  updateVlog,
} from './store'
import * as ephemeral from './store/ephemeral'
import { libraryWindow, settingsWindow } from './windows'

export const vlogIdToPath = new Map<string, string>()

// Initialize recording system

// Helper function to generate a unique ID for a vlog
function generateVlogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

// IPC handlers
export function setupIpcHandlers() {
  ipcMain.handle('getScreenSources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
      })
      return sources
    } catch (error) {
      console.error('Error getting screen sources:', error)
      throw error
    }
  })

  ipcMain.handle('getState', async () => {
    return store.store
  })

  ipcMain.handle('setPartialState', async (_, state: Partial<State>) => {
    store.set(state)
  })

  ipcMain.handle('getRecordedFiles', async () => {
    try {
      const documentsPath = getRecordingsDir()

      // Create directory if it doesn't exist
      await mkdir(documentsPath, { recursive: true })

      // Get existing vlog data from store
      const storedVlogs = getAllVlogs()

      // Get all vlogs from store and check if files still exist
      debug(`Found ${Object.keys(storedVlogs).length} vlogs in store`)
      const allVlogs = await Promise.all(
        Object.entries(storedVlogs).map(async ([id, vlog]) => {
          try {
            debug(`Checking file: ${vlog.path}`)
            // Check if file still exists
            await access(vlog.path)
            const stats = await stat(vlog.path)
            debug(`File exists and accessible: ${vlog.name}`)

            // Update the mapping
            vlogIdToPath.set(id, vlog.path)

            return {
              id: vlog.id,
              name: vlog.name,
              title: (vlog as any).title,
              path: vlog.path,
              size: stats.size,
              created: new Date(vlog.timestamp), // Use stored timestamp
              modified: stats.mtime,
              thumbnailPath: `vlog-thumbnail://${id}.jpg`,
              duration: vlog.duration, // Use cached duration if available
              summary: vlog.summary,
              transcription: vlog.transcription?.result || undefined,
            }
          } catch (error) {
            // File doesn't exist anymore, skip it
            debug(`Skipping missing file: ${vlog.path} - Error: ${error}`)
            return null
          }
        }),
      )

      // Filter out null entries (missing files) and sort by creation date
      const validVlogs = allVlogs
        .filter((vlog): vlog is NonNullable<typeof vlog> => vlog !== null)
        .sort((a, b) => b.created.getTime() - a.created.getTime())

      debug(`Returning ${validVlogs.length} valid vlogs`)
      return validVlogs
    } catch (error) {
      console.error('Error getting recorded files:', error)
      return []
    }
  })

  ipcMain.handle('openFileLocation', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }
      await shell.showItemInFolder(filePath)
    } catch (error) {
      console.error('Error opening vlog location:', error)
      throw error
    }
  })

  ipcMain.handle('untrackVlog', async (_, vlogId: string) => {
    try {
      // Remove from vlog store (but keep the file)
      deleteVlog(vlogId)
      vlogIdToPath.delete(vlogId)
      return true
    } catch (error) {
      console.error('Error untracking vlog:', error)
      throw error
    }
  })

  //
  //
  //
  //

  ipcMain.handle('startStreamingRecording', async (_, filename: string) => {
    return startStreamingRecording(filename)
  })

  ipcMain.handle(
    'appendRecordingChunk',
    async (_, recordingId: string, chunk: ArrayBuffer) => {
      return appendRecordingChunk(recordingId, chunk)
    },
  )

  ipcMain.handle(
    'finalizeStreamingRecording',
    async (_, recordingId: string) => {
      return finalizeStreamingRecording(recordingId)
    },
  )

  // Recording system handlers
  ipcMain.handle('startRecording', async (_, config: RecordingConfig) => {
    return await startRecording(config)
  })

  ipcMain.handle('stopRecording', async () => {
    return await stopRecording()
  })

  ipcMain.handle('getRecordingState', async () => {
    return getRecordingState()
  })

  ipcMain.handle('emergencySaveRecording', async () => {
    return await emergencySave()
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

  // Transcription handlers
  ipcMain.handle('transcribeVideo', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      // Set ephemeral transcription state
      ephemeral.setTranscriptionProgress(vlogId, 0)

      // Get speed-up setting
      const speedUp = store.get('transcriptionSpeedUp') || false
      const result = await transcribeVideo(filePath, speedUp, (progress) => {
        // Update progress in ephemeral state only
        ephemeral.setTranscriptionProgress(vlogId, Math.round(progress))

        // Notify renderer of progress update
        libraryWindow?.webContents.send(
          'transcription-progress-updated',
          vlogId,
          Math.round(progress),
        )
      })

      // Clean up ephemeral state
      ephemeral.removeTranscription(vlogId)

      // Save only the final result to persistent store
      const completedState = {
        status: 'completed' as const,
        result: result,
      }
      updateVlog(vlogId, { transcription: completedState })

      // Automatically generate summary if transcription was successful
      try {
        console.log(`Auto-generating summary for vlog ${vlogId}`)
        const summary = await generateVideoSummary(vlogId, result.text)
        updateVlog(vlogId, { summary })

        // Notify renderer that summary was generated
        libraryWindow?.webContents.send('summary-generated', vlogId, summary)
        console.log(`Summary generated and saved for vlog ${vlogId}`)
      } catch (summaryError) {
        console.error('Error generating automatic summary:', summaryError)
        // Don't fail the transcription if summary generation fails
        // Just log the error and continue
      }

      return result
    } catch (error) {
      console.error('Error transcribing video:', error)

      // Clean up ephemeral state on error
      ephemeral.removeTranscription(vlogId)

      // Save error state to persistent store
      const errorState = {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      updateVlog(vlogId, { transcription: errorState })

      throw error
    }
  })

  ipcMain.handle('getTranscription', async (_, vlogId: string) => {
    try {
      const vlog = getVlog(vlogId)
      if (!vlog || !vlog.transcription) {
        return null
      }
      return vlog.transcription.result || null
    } catch (error) {
      console.error('Error getting transcription:', error)
      return null
    }
  })

  ipcMain.handle('getTranscriptionState', async (_, vlogId: string) => {
    try {
      // Check ephemeral state first (for active transcriptions)
      if (ephemeral.isTranscriptionActive(vlogId)) {
        const progress = ephemeral.getTranscriptionProgress(vlogId)
        return {
          status: 'transcribing',
          progress: progress ?? 0,
        }
      }

      // Fall back to persistent state (for completed/error states)
      const vlog = getVlog(vlogId)
      return vlog?.transcription || { status: 'idle' }
    } catch (error) {
      console.error('Error getting transcription state:', error)
      throw error
    }
  })

  // Load and cache video duration on demand (performance optimization)
  // This avoids calculating duration for all videos on load, which would be very slow
  // Duration is only calculated when the user actually opens/selects a video
  ipcMain.handle(
    'loadVideoDuration',
    tryCatchIpcMain(async (_, vlogId: string) => {
      console.log('loadVideoDuration', vlogId)

      try {
        const vlog = getVlog(vlogId)
        if (!vlog) {
          console.log('vlog not found for vlog', vlogId)
          throw new Error(`Vlog with ID ${vlogId} not found`)
        }

        console.log('vlog', vlog)

        // Return cached duration if available
        if (vlog.duration !== undefined) {
          return vlog.duration
        }

        // Calculate and cache duration
        const filePath = vlogIdToPath.get(vlogId)
        if (!filePath) {
          console.log('filePath not found for vlog', vlogId)
          throw new Error(`File path not found for vlog ${vlogId}`)
        }

        console.log('filePath', filePath)

        const duration = await getVideoDuration(filePath)
        console.log('duration', duration)

        // Cache the duration in the store
        if (duration) {
          updateVlog(vlogId, { duration })
        }

        return duration
      } catch (error) {
        console.error('Error loading video duration:', error)
        throw error
      }
    }),
  )

  // Vlog management handlers
  ipcMain.handle('getVlog', async (_, vlogId: string) => {
    try {
      return getVlog(vlogId)
    } catch (error) {
      console.error('Error getting vlog:', error)
      throw error
    }
  })

  ipcMain.handle(
    'updateVlog',
    async (_, vlogId: string, updates: Partial<Vlog>) => {
      try {
        updateVlog(vlogId, updates)
        return true
      } catch (error) {
        console.error('Error updating vlog:', error)
        throw error
      }
    },
  )

  // Transcription settings handlers

  // Summary handlers

  ipcMain.handle(
    'generateVideoSummary',
    async (_, vlogId: string, transcription: string) => {
      try {
        const summary = await generateVideoSummary(vlogId, transcription)

        // Save the generated summary in the Vlog object
        updateVlog(vlogId, { summary })

        return summary
      } catch (error) {
        console.error('Error generating video summary:', error)
        throw error
      }
    },
  )

  ipcMain.handle(
    'saveVideoSummary',
    async (_, vlogId: string, summary: string) => {
      try {
        updateVlog(vlogId, { summary })
      } catch (error) {
        console.error('Error saving video summary:', error)
        throw error
      }
    },
  )

  // Import external video file handler
  ipcMain.handle('importVideoFile', async (_, filePath: string) => {
    try {
      // Check if file exists
      await access(filePath)

      // Get file stats
      const stats = await stat(filePath)
      const fileName =
        filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

      // Generate unique ID for the file
      const id = generateVlogId(filePath)

      // Check if file already exists
      const existingVlog = getVlog(id)
      if (existingVlog) {
        return {
          success: false,
          isDuplicate: true,
          message: `"${fileName}" is already in your library`,
          existingVlog: {
            id: existingVlog.id,
            name: existingVlog.name,
            title: (existingVlog as any).title,
            path: existingVlog.path,
            size: stats.size,
            created: new Date(existingVlog.timestamp),
            modified: stats.mtime,
            thumbnailPath: `vlog-thumbnail://${id}.jpg`,
            summary: existingVlog.summary,
            transcription: existingVlog.transcription,
          },
        }
      }

      // Store the mapping
      vlogIdToPath.set(id, filePath)

      // Extract date from title using AI - fail if no date found
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

      // Create date from components (all required now)
      const createdDate = new Date(
        dateResult.year,
        dateResult.month - 1,
        dateResult.day,
        dateResult.hour,
        dateResult.minute,
        0,
        0,
      )

      // Create vlog entry
      const vlog: Vlog = {
        id,
        name: fileName,
        path: filePath,
        timestamp: createdDate.toISOString(),
      }
      setVlog(vlog)

      debug(`Imported video file: ${filePath}`)
      return {
        success: true,
        isDuplicate: false,
        message: `Successfully imported "${fileName}"`,
        vlog: {
          id,
          name: fileName,
          title: (vlog as any).title,
          path: filePath,
          size: stats.size,
          created: createdDate,
          modified: stats.mtime,
          thumbnailPath: `vlog-thumbnail://${id}.jpg`,
          summary: vlog.summary,
          transcription: vlog.transcription,
        },
      }
    } catch (error) {
      console.error('Error importing video file:', error)
      throw error
    }
  })

  // Video position handlers
  ipcMain.handle(
    'saveVideoPosition',
    async (_, vlogId: string, position: number) => {
      try {
        const now = new Date().toISOString()
        updateVlog(vlogId, {
          lastPosition: position,
          lastPositionTimestamp: now,
        })
        return true
      } catch (error) {
        console.error('Error saving video position:', error)
        throw error
      }
    },
  )

  ipcMain.handle('getVideoPosition', async (_, vlogId: string) => {
    try {
      const vlog = getVlog(vlogId)
      if (!vlog) {
        return null
      }

      // Check if position is less than 30 minutes old
      if (vlog.lastPositionTimestamp) {
        const lastPositionTime = new Date(vlog.lastPositionTimestamp)
        const now = new Date()
        const timeDiff = now.getTime() - lastPositionTime.getTime()
        const thirtyMinutes = 30 * 60 * 1000 // 30 minutes in milliseconds

        if (timeDiff < thirtyMinutes && vlog.lastPosition !== undefined) {
          return {
            position: vlog.lastPosition,
            timestamp: vlog.lastPositionTimestamp,
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error getting video position:', error)
      return null
    }
  })

  // Auto-updater handlers

  // Settings window handlers
  ipcMain.handle('openSettingsWindow', async () => {
    try {
      settingsWindow?.show()
      return { success: true, windowId: settingsWindow?.id || 0 }
    } catch (error) {
      console.error('Error opening settings window:', error)
      throw error
    }
  })

  // Gemini API key handlers
  ipcMain.handle('getGeminiApiKey', async () => {
    try {
      return store.get('geminiApiKey') || ''
    } catch (error) {
      console.error('Error getting Gemini API key:', error)
      throw error
    }
  })

  ipcMain.handle('setGeminiApiKey', async (_, apiKey: string) => {
    try {
      store.set('geminiApiKey', apiKey)
      return true
    } catch (error) {
      console.error('Error setting Gemini API key:', error)
      throw error
    }
  })

  // MP4 conversion handler
  ipcMain.handle('convertToMp4', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      // Check if file is webm
      if (!filePath.toLowerCase().endsWith('.webm')) {
        throw new Error('Only WebM files can be converted to MP4')
      }

      // Create output path with .mp4 extension
      const outputPath = filePath.replace(/\.webm$/i, '.mp4')

      // Check if output file already exists
      try {
        await access(outputPath)
        throw new Error('MP4 file already exists')
      } catch (err: any) {
        // File doesn't exist, which is what we want
        if (err.code !== 'ENOENT') {
          throw err
        }
      }

      // Run ffmpeg conversion using hardware acceleration on macOS
      console.log('Converting video to MP4:', filePath)

      // Mark conversion as active
      ephemeral.setConversionProgress(vlogId, 0)

      await VideoConverter.convertToMP4(filePath, outputPath, (progress) => {
        console.log(`[IPC] Conversion progress for ${vlogId}: ${progress}%`)
        // Update ephemeral state
        ephemeral.setConversionProgress(vlogId, progress)
        // Send progress updates to renderer
        libraryWindow?.webContents.send('conversion-progress', vlogId, progress)
      })

      // Remove from active conversions
      ephemeral.removeConversion(vlogId)

      // Create a new vlog entry for the converted file
      const stats = await stat(outputPath)
      const fileName =
        outputPath.split('/').pop() || outputPath.split('\\').pop() || 'unknown'
      const id = generateVlogId(outputPath)

      // Get the original vlog's timestamp
      const originalVlog = getVlog(vlogId)
      const timestamp = originalVlog?.timestamp || new Date().toISOString()

      // Store the mapping
      vlogIdToPath.set(id, outputPath)

      // Create vlog entry with the same timestamp as original
      const vlog: Vlog = {
        id,
        name: fileName,
        path: outputPath,
        timestamp: timestamp,
      }
      setVlog(vlog)

      debug(`Converted video to MP4: ${outputPath}`)
      return {
        success: true,
        message: `Successfully converted to MP4`,
        newVlogId: id,
        outputPath: outputPath,
      }
    } catch (error) {
      console.error('Error converting to MP4:', error)
      // Remove from active conversions on error
      ephemeral.removeConversion(vlogId)
      throw error
    }
  })

  // Get conversion state
  ipcMain.handle('getConversionState', async (_, vlogId: string) => {
    return {
      isActive: ephemeral.isConversionActive(vlogId),
      progress: ephemeral.getConversionProgress(vlogId),
    }
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
      throw error
    }
  }
}
