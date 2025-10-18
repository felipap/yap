import { createHash } from 'crypto'
import { app, BrowserWindow, desktopCapturer, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { access, mkdir, stat, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { State, UserProfile, Vlog } from '../shared-types'
import { extractDateFromTitle } from './ai/date-from-title'
import { debug } from './lib/logger'
import { getVideoDuration, transcribeVideo } from './lib/transcription'
import { generateVideoSummary } from './lib/videoSummary'
import {
  deleteVlog,
  getAllVlogs,
  getVlog,
  setVlog,
  store,
  updateVlog,
} from './store'
import { createSettingsWindow } from './window'

export const vlogIdToPath = new Map<string, string>()

// Helper function to generate a unique ID for a vlog
function generateVlogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}

// IPC handlers
export function setupIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('get-screen-sources', async () => {
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

  ipcMain.handle('get-recorded-files', async () => {
    try {
      const documentsPath = join(homedir(), 'Documents', 'VlogRecordings')

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

  ipcMain.handle('open-file-location', async (_, vlogId: string) => {
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

  ipcMain.handle('untrack-vlog', async (_, vlogId: string) => {
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

  ipcMain.handle(
    'save-recording',
    async (_, filename: string, arrayBuffer: ArrayBuffer) => {
      try {
        const recordingsDir = join(homedir(), 'Documents', 'VlogRecordings')
        await mkdir(recordingsDir, { recursive: true })

        const filepath = join(recordingsDir, filename)
        const buffer = Buffer.from(arrayBuffer)
        await writeFile(filepath, buffer)

        const id = generateVlogId(filepath)
        vlogIdToPath.set(id, filepath)

        // Create and save vlog object
        const vlog: Vlog = {
          id,
          name: filename,
          path: filepath,
          timestamp: new Date().toISOString(),
        }
        setVlog(vlog)

        debug(`Recording saved: ${filepath}`)
        return id
      } catch (error) {
        console.error('Error saving recording:', error)
        throw error
      }
    },
  )

  // Store handlers
  ipcMain.handle('store-get', (_, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('store-set', (_, key: string, value: any) => {
    store.set(key, value)
  })

  ipcMain.handle('store-get-all', () => {
    return store.store
  })

  // Transcription handlers
  ipcMain.handle('transcribe-video', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      // Set transcription state to transcribing
      const transcriptionState = {
        status: 'transcribing' as const,
        startTime: Date.now(),
        progress: 0,
      }
      updateVlog(vlogId, { transcription: transcriptionState })

      // Notify renderer that transcription started
      mainWindow?.webContents.send(
        'transcription-status-changed',
        vlogId,
        transcriptionState,
      )

      // Get speed-up setting
      const speedUp = store.get('transcriptionSpeedUp') || false
      const result = await transcribeVideo(filePath, speedUp, (progress) => {
        // Update progress in store
        const updatedState = {
          ...transcriptionState,
          progress: Math.round(progress),
        }
        updateVlog(vlogId, { transcription: updatedState })

        // Notify renderer of progress update
        mainWindow?.webContents.send(
          'transcription-progress-updated',
          vlogId,
          Math.round(progress),
        )
      })

      // Update transcription state to completed
      const completedState = {
        status: 'completed' as const,
        result: result,
        startTime: transcriptionState.startTime,
      }
      updateVlog(vlogId, { transcription: completedState })

      // Notify renderer that transcription completed
      mainWindow?.webContents.send(
        'transcription-status-changed',
        vlogId,
        completedState,
      )

      // Automatically generate summary if transcription was successful
      try {
        console.log(`Auto-generating summary for vlog ${vlogId}`)
        const summary = await generateVideoSummary(vlogId, result.text)
        updateVlog(vlogId, { summary })

        // Notify renderer that summary was generated
        mainWindow?.webContents.send('summary-generated', vlogId, summary)
        console.log(`Summary generated and saved for vlog ${vlogId}`)
      } catch (summaryError) {
        console.error('Error generating automatic summary:', summaryError)
        // Don't fail the transcription if summary generation fails
        // Just log the error and continue
      }

      return result
    } catch (error) {
      console.error('Error transcribing video:', error)

      // Update transcription state to error
      const errorState = {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime: Date.now(),
      }
      updateVlog(vlogId, { transcription: errorState })

      // Notify renderer that transcription failed
      mainWindow?.webContents.send(
        'transcription-status-changed',
        vlogId,
        errorState,
      )

      throw error
    }
  })

  ipcMain.handle('get-transcription', async (_, vlogId: string) => {
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

  ipcMain.handle('get-transcription-state', async (_, vlogId: string) => {
    try {
      const vlog = getVlog(vlogId)
      return vlog?.transcription || { status: 'idle' }
    } catch (error) {
      console.error('Error getting transcription state:', error)
      throw error
    }
  })

  ipcMain.handle('get-all-transcription-states', async () => {
    try {
      const vlogs = getAllVlogs()
      const states: Record<string, any> = {}
      for (const [id, vlog] of Object.entries(vlogs)) {
        if (vlog.transcription) {
          states[id] = vlog.transcription
        }
      }
      return states
    } catch (error) {
      console.error('Error getting all transcription states:', error)
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
  ipcMain.handle('get-vlog', async (_, vlogId: string) => {
    try {
      return getVlog(vlogId)
    } catch (error) {
      console.error('Error getting vlog:', error)
      throw error
    }
  })

  ipcMain.handle('get-all-vlogs', async () => {
    try {
      return getAllVlogs()
    } catch (error) {
      console.error('Error getting all vlogs:', error)
      throw error
    }
  })

  ipcMain.handle(
    'update-vlog',
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
  ipcMain.handle('get-transcription-speed-up', async () => {
    try {
      return store.get('transcriptionSpeedUp') || false
    } catch (error) {
      console.error('Error getting transcription speed-up setting:', error)
      throw error
    }
  })

  ipcMain.handle('set-transcription-speed-up', async (_, speedUp: boolean) => {
    try {
      store.set('transcriptionSpeedUp', speedUp)
      return true
    } catch (error) {
      console.error('Error setting transcription speed-up:', error)
      throw error
    }
  })

  // User profile handlers
  ipcMain.handle('get-user-profile', async () => {
    try {
      const profile: UserProfile = store.get('userProfile') || {
        name: 'Felipe',
        role: 'Solo founder/entrepreneur',
        interests: [
          'AI',
          'tech projects',
          'workflow automation',
          'inbox agents',
        ],
        languages: ['English', 'Portuguese'],
        context:
          'Working on AI and tech projects, exploring business ideas, considering co-founders for certain projects',
      }
      return profile
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  })

  ipcMain.handle('update-user-profile', async (_, profile: UserProfile) => {
    try {
      store.set('userProfile', profile)
      return true
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  })

  // Summary handlers

  ipcMain.handle(
    'generate-video-summary',
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
    'save-video-summary',
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
  ipcMain.handle('import-video-file', async (_, filePath: string) => {
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
    'save-video-position',
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

  ipcMain.handle('get-video-position', async (_, vlogId: string) => {
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
  ipcMain.handle('check-for-updates', async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        return { available: false, message: 'Updates disabled in development' }
      }

      const result = await autoUpdater.checkForUpdates()
      return { available: !!result, message: 'Update check completed' }
    } catch (error) {
      console.error('Error checking for updates:', error)
      throw error
    }
  })

  ipcMain.handle('download-update', async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Updates disabled in development')
      }

      autoUpdater.downloadUpdate()
      return { success: true, message: 'Download started' }
    } catch (error) {
      console.error('Error downloading update:', error)
      throw error
    }
  })

  ipcMain.handle('install-update', async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Updates disabled in development')
      }

      autoUpdater.quitAndInstall()
      return { success: true, message: 'Installing update...' }
    } catch (error) {
      console.error('Error installing update:', error)
      throw error
    }
  })

  ipcMain.handle('get-app-version', async () => {
    try {
      return app.getVersion()
    } catch (error) {
      console.error('Error getting app version:', error)
      throw error
    }
  })

  // Settings window handlers
  ipcMain.handle('open-settings-window', async () => {
    try {
      const settingsWindow = createSettingsWindow()
      return { success: true, windowId: settingsWindow.id }
    } catch (error) {
      console.error('Error opening settings window:', error)
      throw error
    }
  })

  // Gemini API key handlers
  ipcMain.handle('get-gemini-api-key', async () => {
    try {
      return store.get('geminiApiKey') || ''
    } catch (error) {
      console.error('Error getting Gemini API key:', error)
      throw error
    }
  })

  ipcMain.handle('set-gemini-api-key', async (_, apiKey: string) => {
    try {
      store.set('geminiApiKey', apiKey)
      return true
    } catch (error) {
      console.error('Error setting Gemini API key:', error)
      throw error
    }
  })

  // Set up state change listener
  store.onDidAnyChange((state) => {
    mainWindow?.webContents.send('state-changed', state)
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
