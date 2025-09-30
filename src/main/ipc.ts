import { ipcMain, desktopCapturer, shell } from 'electron'
import { join } from 'path'
import { readdir, stat, writeFile, mkdir, unlink, access } from 'fs/promises'
import { homedir } from 'os'
import { createHash } from 'crypto'
import { store } from './store'
import { getThumbnailPath } from './lib/thumbnails'
import { transcribeVideo, getVideoDuration } from './lib/transcription'

// Store mapping of vlog IDs to paths
export const vlogIdToPath = new Map<string, string>()

// Helper function to generate a unique ID for a vlog
function generateVlogId(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').substring(0, 16)
}


// IPC handlers
export function setupIpcHandlers() {
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

      const files = await readdir(documentsPath)

      const fileStats = await Promise.all(
        files
          .filter(file => file.endsWith('.mp4') || file.endsWith('.webm'))
          .map(async (file) => {
            const filePath = join(documentsPath, file)
            const stats = await stat(filePath)
            const id = generateVlogId(filePath)

            // Store the mapping
            vlogIdToPath.set(id, filePath)

            // Check if thumbnail exists
            const thumbnailPath = getThumbnailPath(filePath)

            return {
              id,
              name: file,
              path: filePath,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
              thumbnailPath: `vlog-thumbnail://${id}.jpg`
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

      // Get API key from settings
      const apiKey = store.get('openaiApiKey')
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please add "openaiApiKey" to your vlog-settings.json file.')
      }

      const result = await transcribeVideo(filePath, apiKey)

      // Store transcription result in the store
      const transcriptionKey = `transcription_${vlogId}`
      store.set(transcriptionKey, result)

      return result
    } catch (error) {
      console.error('Error transcribing video:', error)
      throw error
    }
  })

  ipcMain.handle('get-transcription', async (_, vlogId: string) => {
    try {
      const transcriptionKey = `transcription_${vlogId}`
      return store.get(transcriptionKey) || null
    } catch (error) {
      console.error('Error getting transcription:', error)
      return null
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
}
