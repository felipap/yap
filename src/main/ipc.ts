import { ipcMain, desktopCapturer, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { readdir, stat, writeFile, mkdir, unlink, access } from 'fs/promises'
import { homedir } from 'os'
import { createHash } from 'crypto'
import { store, Vlog, UserProfile, setVlog, getVlog, updateVlog, deleteVlog, getAllVlogs } from './store'
import { getThumbnailPath } from './lib/thumbnails'
import { transcribeVideo, getVideoDuration } from './lib/transcription'
import { generateVideoSummary } from './lib/videoSummary'


// Store mapping of vlog IDs to paths
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

      // Scan filesystem for video files
      const files = await readdir(documentsPath)
      const videoFiles = files.filter(file => file.endsWith('.mp4') || file.endsWith('.webm'))

      const fileStats = await Promise.all(
        videoFiles.map(async (file) => {
          const filePath = join(documentsPath, file)
          const stats = await stat(filePath)
          const id = generateVlogId(filePath)

          // Store the mapping
          vlogIdToPath.set(id, filePath)

          // Get or create vlog data
          let vlog = storedVlogs[id]
          if (!vlog) {
            // Create new vlog entry
            vlog = {
              id,
              name: file,
              path: filePath,
              timestamp: stats.birthtime.toISOString()
            }
            setVlog(vlog)
          }

          return {
            id,
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            thumbnailPath: `vlog-thumbnail://${id}.jpg`,
            summary: vlog.summary,
            transcription: vlog.transcription
          }
        })
      )

      return fileStats.sort((a, b) => b.created.getTime() - a.created.getTime())
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

      // Get API key from environment variable
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.')
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
      const result = await transcribeVideo(filePath, apiKey, speedUp)

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
}
