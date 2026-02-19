import { cleanTranscript } from './ai/clean-transcript'
import { generateSummary } from './ai/summarize-transcript'
import { transcribeVideo } from './lib/transcription'
import { getGeminiApiKey, getLog, store } from './store'
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

        const errorState = {
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        await setTranscriptionData(logId, errorState)

        throw error
      }

      ephemeral.removeTranscription(logId)

      // Clean up filler words with Gemini if key is available
      const geminiApiKey = getGeminiApiKey() || null
      if (geminiApiKey) {
        try {
          result = await cleanTranscript(result, geminiApiKey)
        } catch (error) {
          console.warn('Transcript cleaning failed, using raw transcription:', error)
        }
      }

      await setTranscriptionData(logId, {
        status: 'completed',
        result,
      })
      if (geminiApiKey) {
        triggerGenerateSummary(logId, geminiApiKey)
      }

      return result
    } catch (error) {
      console.error('triggerTrascribe threw', error)
      return null
    }
  }, 10)
}

export async function triggerGenerateSummary(
  logId: string,
  // Take as an argument to force parent to deal with abscence of key.
  geminiApiKey: string,
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

      const result = await generateSummary(transcription.result.text, geminiApiKey)
      if (!result.success) {
        return result
      }

      await setSummaryData(logId, result.summary)
      return result
    } catch (error) {
      console.error('asyncGenerateVideoSummary threw', error)
      return null
    }
  }, 10)
}
