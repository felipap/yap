import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { access, stat } from 'fs/promises'
import { dirname, resolve } from 'path'
import { EnrichedLog, Log } from '../../shared-types'
import { extractDateFromTitle } from '../ai/date-from-title'
import { fileExists } from '../lib/filesystem'
import { debug } from '../lib/logger'
import { getVideoDuration } from '../lib/transcription'
import {
  extractVideoMetadata,
  formatDateForPrompt,
  isIPhoneVideoFilename,
} from '../lib/video-metadata'
import {
  deleteLog,
  generateLogId,
  getAllLogs,
  getLog,
  getOpenaiApiKey,
  onLogChange,
  setLog,
  updateLog,
} from '../store'
import { getActiveRecordingsDir } from '../store/default-folder'
import * as ephemeral from '../store/ephemeral'
import {
  getSummaryData,
  getTranscriptionData,
} from '../store/transcripts'
import { triggerTranscribe } from '../tasks'
import { libraryWindow } from '../windows'
import { tryCatchIpcMain } from './utils'

// Helper function to detect if a file is audio-only
function isAudioOnlyFile(filePath: string): boolean {
  const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac']
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || ''

  // Check if it's an audio file extension or an "Audio Log" recording
  return audioExtensions.includes(ext) || fileName.startsWith('Audio ')
}

// Converts a persisted Log to an EnrichedLog with file system stats
// Checks if the file exists and enriches with stats accordingly
export async function enrichLog(log: Log): Promise<EnrichedLog> {
  const createdDate = new Date(log.timestamp)

  // Check if file is in default folder
  const recordingsDir = getActiveRecordingsDir()
  const defaultDir = resolve(recordingsDir)
  const fileDir = resolve(dirname(log.path))

  // Compare normalized paths (handle case sensitivity on macOS)
  const isInDefaultFolder = fileDir.toLowerCase() === defaultDir.toLowerCase()

  const transcriptionData = await getTranscriptionData(log.id)
  const summary = await getSummaryData(log.id)

  let fileExistsOnDisk = true
  try {
    await stat(log.path)
  } catch {
    fileExistsOnDisk = false
  }

  const thumbQuery = log.thumbnailUpdatedAt ? `?v=${log.thumbnailUpdatedAt}` : ''

  return {
    id: log.id,
    name: log.name,
    title: log.title,
    path: log.path,
    created: createdDate,
    thumbnailPath: `log-thumbnail://${log.id}.jpg${thumbQuery}`,
    duration: log.duration,
    summary: summary ?? undefined,
    transcription: transcriptionData?.result || undefined,
    isAudioOnly: log.isAudioOnly,
    isFavorited: log.isFavorited,
    fileExists: fileExistsOnDisk,
    isInDefaultFolder,
  }
}

export function setupLogHandlers() {
  ipcMain.handle(
    'getSidebarLogs',
    tryCatchIpcMain(async () => {
      const storedLogs = getAllLogs()

      debug(`Found ${Object.keys(storedLogs).length} logs in store`)

      const enrichedLogs = Object.values(storedLogs).map((log) => {
        const createdDate = new Date(log.timestamp)
        const thumbQuery = log.thumbnailUpdatedAt ? `?v=${log.thumbnailUpdatedAt}` : ''

        return {
          id: log.id,
          name: log.name,
          title: log.title,
          path: log.path,
          created: createdDate,
          thumbnailPath: `log-thumbnail://${log.id}.jpg${thumbQuery}`,
          duration: log.duration,
          isAudioOnly: log.isAudioOnly,
          isFavorited: log.isFavorited,
        }
      })

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
      const log = getLog(logId)
      if (!log) {
        throw new Error(`Log with ID ${logId} not found`)
      }
      let pathToOpen: string
      const exists = await fileExists(log.path)
      if (exists) {
        pathToOpen = log.path
      } else {
        pathToOpen = dirname(log.path)
      }
      await shell.showItemInFolder(pathToOpen)
    }),
  )

  ipcMain.handle(
    'untrackLog',
    tryCatchIpcMain(async (_, logId: string) => {
      deleteLog(logId)
      return true
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
      const log = getLog(logId)
      if (!log) {
        return null
      }
      return await enrichLog(log)
    }),
  )

  ipcMain.handle(
    'updateLog',
    tryCatchIpcMain(async (_, logId: string, updates: Partial<Log>) => {
      updateLog(logId, updates)
      return true
    }),
  )

  ipcMain.handle(
    'onViewLogEntry',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        return { error: 'Log not found' }
      }

      // Auto-load duration if not present
      if (log.duration === undefined && log.path) {
        try {
          const duration = await getVideoDuration(log.path)
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
      const transcription = await getTranscriptionData(logId)
      const needsTranscription =
        (!transcription || transcription.status === 'idle') &&
        log.path &&
        !ephemeral.isTranscriptionActive(logId)

      if (needsTranscription) {
        // Try to trigger transcription
        const openaiApiKey = getOpenaiApiKey()
        if (openaiApiKey) {
          triggerTranscribe(logId, openaiApiKey)
        } else {
          console.warn('No OpenAI API key found, skipping transcription')
        }
      }
    }),
  )

  ipcMain.handle(
    'importVideoFile',
    tryCatchIpcMain(async (_, filePath: string) => {
      try {
        await access(filePath)
      } catch (error) {
        console.error('Error accessing file:', error)
        throw new Error(`Could not access file: ${filePath}`)
      }

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

  // Broadcast log changes to all renderer windows
  onLogChange((logId) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window.isDestroyed()) {
        return
      }
      window.webContents.send('log-updated', logId)
    })
  })
}
