import { cleanTranscript } from './ai/clean-transcript'
import { generateSummary } from './ai/summarize-transcript'
import { transcribeVideo } from './lib/transcription'
import { getGeminiApiKey, getLog, store, updateLog } from './store'
import { libraryWindow } from './windows'
import * as ephemeral from './store/ephemeral'

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
        updateLog(logId, { transcription: errorState })

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

      updateLog(logId, {
        transcription: {
          status: 'completed',
          result,
        },
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

      const transcript = log.transcription?.result?.text
      if (!transcript) {
        throw new Error('Transcript not found')
      }

      const result = await generateSummary(transcript, geminiApiKey)
      // Only update if summary is not empty (don't set summary field for
      // "nothing to transcribe")
      if (!result.success) {
        return result
      }

      updateLog(logId, { summary: result.summary })
      return result
    } catch (error) {
      console.error('asyncGenerateVideoSummary threw', error)
      return null
    }
  }, 10)
}
