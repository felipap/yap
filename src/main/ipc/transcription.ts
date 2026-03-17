import { ipcMain, shell } from 'electron'
import { getLog, getOpenaiApiKey } from '../store'
import * as ephemeral from '../store/ephemeral'
import {
  getSummaryFilePath,
  getTranscriptionData,
  getTranscriptionFilePath,
} from '../store/transcripts'
import { triggerGenerateSummary, triggerTranscribe } from '../tasks'
import { tryCatchIpcMain } from './utils'

export function setupTranscriptionHandlers() {
  ipcMain.handle(
    'transcribeVideo',
    tryCatchIpcMain(async (_, logId: string) => {
      const log = getLog(logId)
      if (!log) {
        throw new Error(`Log with ID ${logId} not found`)
      }

      const openaiApiKey = getOpenaiApiKey()
      if (!openaiApiKey) {
        throw new Error('OpenAI API key is not set')
      }

      triggerTranscribe(logId, openaiApiKey)
    }),
  )

  ipcMain.handle(
    'getTranscription',
    tryCatchIpcMain(async (_, logId: string) => {
      const data = await getTranscriptionData(logId)
      if (!data || data.status !== 'completed' || !data.result) {
        return null
      }
      return data.result
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

      const data = await getTranscriptionData(logId)
      if (data) {
        return {
          status: 'completed',
          result: data,
        }
      }

      return { status: 'idle' }
    }),
  )

  ipcMain.handle(
    'triggerGenerateSummary',
    tryCatchIpcMain(async (_, logId: string) => {
      const apiKey = getOpenaiApiKey()
      if (!apiKey) {
        throw new Error('OpenAI API key is not set')
      }
      triggerGenerateSummary(logId, apiKey)
      return true
    }),
  )

  ipcMain.handle(
    'openTranscriptionFile',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = getTranscriptionFilePath(logId)
      await shell.showItemInFolder(filePath)
    }),
  )

  ipcMain.handle(
    'openSummaryFile',
    tryCatchIpcMain(async (_, logId: string) => {
      const filePath = getSummaryFilePath(logId)
      await shell.showItemInFolder(filePath)
    }),
  )
}
