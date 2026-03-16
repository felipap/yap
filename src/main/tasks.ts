import { cleanTranscript } from './ai/clean-transcript'
import { generateSummary } from './ai/summarize-transcript'
import { transcribeVideo } from './lib/transcription'
import { getOpenaiApiKey, getLog, store } from './store'
import * as ephemeral from './store/ephemeral'
import {
  getTranscriptionData,
  setTranscriptionData,
  setSummaryData,
} from './store/transcripts'
import { libraryWindow } from './windows'

export async function triggerTranscribe(logId: string, openaiApiKey: string) {
  setTimeout(async () => {
    try {
      ephemeral.setTranscriptionProgress(logId, 0)

      const log = getLog(logId)
      if (!log) {
        throw new Error('Log not found')
      }

      const filePath = log.path

      // Helper function to start transcription and generate summary asynchronously
      const speedUp = store.get('transcriptionSpeedUp') || false

      let result: Awaited<ReturnType<typeof transcribeVideo>>
      try {
        result = await transcribeVideo(
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
      } catch (error) {
        ephemeral.removeTranscription(logId)

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        const errorState = {
          status: 'error' as const,
          error: errorMessage,
        }
        await setTranscriptionData(logId, errorState)

        libraryWindow?.webContents.send(
          'transcription-error',
          logId,
          errorMessage,
        )

        throw error
      }

      ephemeral.removeTranscription(logId)

      // Clean up filler words
      try {
        result = await cleanTranscript(result, openaiApiKey)
      } catch (error) {
        console.warn('Transcript cleaning failed, using raw transcription:', error)
      }

      await setTranscriptionData(logId, {
        status: 'completed',
        result,
      })

      triggerGenerateSummary(logId, openaiApiKey)

      return result
    } catch (error) {
      console.error('triggerTrascribe threw', error)
      return null
    }
  }, 10)
}

export async function triggerGenerateSummary(
  logId: string,
  openaiApiKey: string,
) {
  setTimeout(async () => {
    try {
      // Is audio or mp3 file?
      const log = getLog(logId)
      if (!log) {
        throw new Error('Log not found')
      }

      const extension = log.path.split('.').pop()
      if (!log.isAudioOnly && extension !== 'mp4') {
        throw new Error(
          'Only audio logs or mp4 videos can have summaries generated',
        )
      }

      const transcription = await getTranscriptionData(logId)
      if (!transcription?.result?.text) {
        throw new Error('Transcript not found')
      }

      const result = await generateSummary(transcription.result.text, openaiApiKey)
      
      // Save an empty summary to indicate "attempted but no meaningful content"
      // This distinguishes from "never attempted" (no file exists)
      await setSummaryData(logId, result.summary)
      return result
    } catch (error) {
      console.error('asyncGenerateVideoSummary threw', error)
      return null
    }
  }, 10)
}
