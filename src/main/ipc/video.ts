import { dialog, ipcMain } from 'electron'
import { access, copyFile, mkdir, stat } from 'fs/promises'
import { basename, dirname, join, resolve } from 'path'
import { Log } from '../../shared-types'
import { moveToTrash } from '../lib/filesystem'
import { debug } from '../lib/logger'
import { shuffleThumbnail } from '../lib/thumbnails'
import { getVideoDuration } from '../lib/transcription'
import { VideoConverter } from '../lib/videoConverter'
import { deleteLog, generateLogId, getLog, setLog, updateLog } from '../store'
import { getActiveRecordingsDir } from '../store/default-folder'
import * as ephemeral from '../store/ephemeral'
import { copySidecarData } from '../store/transcripts'
import { libraryWindow } from '../windows'
import { tryCatchIpcMain } from './utils'

export function setupVideoHandlers() {
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

      // If the position was saved more than 30 minutes ago, don't remember it.
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

  ipcMain.handle(
    'convertToMp4',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        throw new Error(`Log with ID ${logId} not found`)
      }
      const filePath = log.path

      if (filePath.toLowerCase().endsWith('.mp4')) {
        return {
          success: true,
          message: 'File is already MP4',
          newLogId: logId,
          outputPath: filePath,
        }
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
        return {
          success: false,
          message: 'MP4 file already exists',
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err
        }
        // File doesn't exist, which is what we want - continue
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
      } catch (error) {
        ephemeral.removeConversion(logId)
        throw error
      }

      ephemeral.removeConversion(logId)

      const stats = await stat(outputPath)
      const fileName =
        outputPath.split('/').pop() || outputPath.split('\\').pop() || 'unknown'
      const id = generateLogId(outputPath)

      const originalLog = getLog(logId)
      const timestamp = originalLog?.timestamp || new Date().toISOString()

      const newLog: Log = {
        id,
        name: fileName,
        path: outputPath,
        timestamp: timestamp,
        title: originalLog?.title,
      }
      setLog(newLog)

      if (originalLog) {
        await copySidecarData(logId, id)
      }

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
    }),
  )

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
      const log = getLog(logId)
      if (!log) {
        throw new Error(`Log with ID ${logId} not found`)
      }
      const filePath = log.path

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
        // File doesn't exist, which is what we want - continue
      }

      await copyFile(filePath, newPath)

      debug(`Copied video to recordings folder: ${newPath}`)

      updateLog(logId, { path: newPath, name: fileName })

      const response = await dialog.showMessageBox(libraryWindow, {
        type: 'question',
        buttons: ['Move to Trash', 'Keep Original'],
        defaultId: 0,
        title: 'Delete original file?',
        message: 'File copied successfully!',
        detail: `The file has been copied to the recordings folder. Do you want to move the original file to trash?`,
      })

      if (response.response === 0) {
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

  ipcMain.handle(
    'shuffleThumbnail',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        throw new Error(`Log with ID ${logId} not found`)
      }

      const duration = log.duration || (await getVideoDuration(log.path)) || 10
      const result = await shuffleThumbnail(log.path, duration)
      if (result) {
        updateLog(logId, { thumbnailUpdatedAt: new Date().toISOString() })
      }
      return !!result
    }),
  )
}
