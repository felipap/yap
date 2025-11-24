import { generateSummary } from './ai/summarize-transcript'
import { updateLog } from './store'

export async function triggerGenerateSummary(
  logId: string,
  transcription: string,
  // Take as an argument to force parent to deal with abscence of key.
  geminiApiKey: string,
) {
  setTimeout(async () => {
    try {
      const result = await generateSummary(transcription, geminiApiKey)
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
