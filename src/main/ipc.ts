import { ipcMain, desktopCapturer, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { readdir, stat, writeFile, mkdir, unlink, access } from 'fs/promises'
import { homedir } from 'os'
import { createHash } from 'crypto'
import { store, Vlog, UserProfile, setVlog, getVlog, updateVlog, deleteVlog, getAllVlogs } from './store'
import { getThumbnailPath } from './lib/thumbnails'
import { transcribeVideo, getVideoDuration } from './lib/transcription'
import { generateVideoSummary } from './lib/videoSummary'
import { extractDateFromTitle } from './ai/date-from-title'


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
if (!GEMINI_API_KEY) {
  throw new Error('!GEMINI_API_KEY')
}

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
        types: ['screen', 'window']
      })
      return sources
    } catch (error) {
      console.error('Error getting screen sources:', error)
      throw error
    }
  })

  ipcMain.handle('get-recorded-files', async () => {
    try {
      const documentsPath = join(homedir(), 'Documents', 'VlogRecordings')

      // Create directory if it doesn't exist
      await mkdir(documentsPath, { recursive: true })

      // Get existing vlog data from store
      const storedVlogs = getAllVlogs()

      // Get all vlogs from store and check if files still exist
      console.log(`Found ${Object.keys(storedVlogs).length} vlogs in store`)
      const allVlogs = await Promise.all(
        Object.entries(storedVlogs).map(async ([id, vlog]) => {
          try {
            console.log(`Checking file: ${vlog.path}`)
            // Check if file still exists
            await access(vlog.path)
            const stats = await stat(vlog.path)
            console.log(`File exists and accessible: ${vlog.name}`)

            // Update the mapping
            vlogIdToPath.set(id, vlog.path)

            return {
              id: vlog.id,
              name: vlog.name,
              path: vlog.path,
              size: stats.size,
              created: new Date(vlog.timestamp), // Use stored timestamp
              modified: stats.mtime,
              thumbnailPath: `vlog-thumbnail://${id}.jpg`,
              summary: vlog.summary,
              transcription: vlog.transcription?.result || undefined
            }
          } catch (error) {
            // File doesn't exist anymore, skip it
            console.log(`Skipping missing file: ${vlog.path} - Error: ${error}`)
            return null
          }
        })
      )

      // Filter out null entries (missing files) and sort by creation date
      const validVlogs = allVlogs
        .filter((vlog): vlog is NonNullable<typeof vlog> => vlog !== null)
        .sort((a, b) => b.created.getTime() - a.created.getTime())

      console.log(`Returning ${validVlogs.length} valid vlogs`)
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

  ipcMain.handle('delete-file', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      // Delete the video file
      await unlink(filePath)

      // Delete the thumbnail file if it exists
      const thumbnailPath = getThumbnailPath(filePath)
      try {
        await unlink(thumbnailPath)
      } catch {
        // Thumbnail might not exist, that's okay
      }

      // Remove from vlog store
      deleteVlog(vlogId)
      vlogIdToPath.delete(vlogId)
      return true
    } catch (error) {
      console.error('Error deleting vlog:', error)
      throw error
    }
  })

  ipcMain.handle('save-recording', async (_, filename: string, arrayBuffer: ArrayBuffer) => {
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
        timestamp: new Date().toISOString()
      }
      setVlog(vlog)

      console.log(`Recording saved: ${filepath}`)
      return id
    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
  })

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
        startTime: Date.now()
      }
      updateVlog(vlogId, { transcription: transcriptionState })

      // Notify renderer that transcription started
      mainWindow?.webContents.send('transcription-status-changed', vlogId, transcriptionState)

      // Get speed-up setting
      const speedUp = store.get('transcriptionSpeedUp') || false
      const result = await transcribeVideo(filePath, GEMINI_API_KEY!, speedUp)

      // Update transcription state to completed
      const completedState = {
        status: 'completed' as const,
        result: result,
        startTime: transcriptionState.startTime
      }
      updateVlog(vlogId, { transcription: completedState })

      // Notify renderer that transcription completed
      mainWindow?.webContents.send('transcription-status-changed', vlogId, completedState)

      return result
    } catch (error) {
      console.error('Error transcribing video:', error)

      // Update transcription state to error
      const errorState = {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime: Date.now()
      }
      updateVlog(vlogId, { transcription: errorState })

      // Notify renderer that transcription failed
      mainWindow?.webContents.send('transcription-status-changed', vlogId, errorState)

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

  ipcMain.handle('get-video-duration', async (_, vlogId: string) => {
    try {
      const filePath = vlogIdToPath.get(vlogId)
      if (!filePath) {
        throw new Error(`Vlog with ID ${vlogId} not found`)
      }

      return await getVideoDuration(filePath)
    } catch (error) {
      console.error('Error getting video duration:', error)
      throw error
    }
  })

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

  ipcMain.handle('update-vlog', async (_, vlogId: string, updates: Partial<Vlog>) => {
    try {
      updateVlog(vlogId, updates)
      return true
    } catch (error) {
      console.error('Error updating vlog:', error)
      throw error
    }
  })

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
        interests: ['AI', 'tech projects', 'workflow automation', 'inbox agents'],
        languages: ['English', 'Portuguese'],
        context: 'Working on AI and tech projects, exploring business ideas, considering co-founders for certain projects'
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

  ipcMain.handle('generate-video-summary', async (_, vlogId: string, transcription: string) => {
    try {
      const summary = await generateVideoSummary(vlogId, transcription)

      // Save the generated summary in the Vlog object
      updateVlog(vlogId, { summary })

      return summary
    } catch (error) {
      console.error('Error generating video summary:', error)
      throw error
    }
  })

  ipcMain.handle('save-video-summary', async (_, vlogId: string, summary: string) => {
    try {
      updateVlog(vlogId, { summary })
    } catch (error) {
      console.error('Error saving video summary:', error)
      throw error
    }
  })

  // Import external video file handler
  ipcMain.handle('import-video-file', async (_, filePath: string) => {
    try {
      // Check if file exists
      await access(filePath)

      // Get file stats
      const stats = await stat(filePath)
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

      // Generate unique ID for the file
      const id = generateVlogId(filePath)

      // Store the mapping
      vlogIdToPath.set(id, filePath)

      // Extract date from title using AI - fail if no date found
      const dateResult = await extractDateFromTitle(fileName)
      if (!dateResult.date || dateResult.confidence === 'low') {
        throw new Error(`Could not extract date from filename: "${fileName}". Please ensure the filename contains a date in a recognizable format.`)
      }
      const createdDate = dateResult.date

      // Create vlog entry
      const vlog: Vlog = {
        id,
        name: fileName,
        path: filePath,
        timestamp: createdDate.toISOString()
      }
      setVlog(vlog)

      console.log(`Imported video file: ${filePath}`)
      return {
        id,
        name: fileName,
        path: filePath,
        size: stats.size,
        created: createdDate,
        modified: stats.mtime,
        thumbnailPath: `vlog-thumbnail://${id}.jpg`,
        summary: vlog.summary,
        transcription: vlog.transcription
      }
    } catch (error) {
      console.error('Error importing video file:', error)
      throw error
    }
  })
}
