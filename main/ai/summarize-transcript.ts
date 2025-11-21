import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { store } from '../store'

const GEMINI_API_KEY = store.get('geminiApiKey') || null

const Schema = z.object({
  summary: z.string().describe('The objective summary of the log transcript'),
  hasContent: z
    .boolean()
    .describe(
      'Whether the transcript contains meaningful content to summarize',
    ),
})

export type Result = z.infer<typeof Schema>

export async function generateVideoSummary(
  logId: string,
  transcription: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not set')
  }

  // Get user context for personalized summaries
  const userContext = store.get('userContext') || ''

  // Build the prompt with optional user context
  const contextSection = userContext.trim()
    ? `\n\nAdditional context about the speaker:\n${userContext}`
    : ''

  const prompt = `You are a helpful assistant that creates objective, factual summaries of video logs.

Create a summary that:
- Captures the main points, key topics, and important insights in 2-3 paragraphs
- Focuses on what was actually discussed, not advice or commentary
- Notes any specific people mentioned
- Highlights any concrete next steps or decisions made
- Mentions the context and mood of the recording
- Is written in third person, objective tone
- Avoids addressing the speaker directly or giving advice
- Simply reports what was said and discussed${contextSection}

If the transcript is empty or contains no meaningful words, set hasContent to false.

Please create an objective summary of this log transcript:

${transcription || ''}`

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  let res
  try {
    res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'The objective summary of the log transcript',
            },
            hasContent: {
              type: 'boolean',
              description:
                'Whether the transcript contains meaningful content to summarize',
            },
          },
          required: ['summary', 'hasContent'],
        },
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    })
  } catch (error) {
    // If transcription is empty, return empty string (don't set summary)
    if (!transcription || transcription.trim().length === 0) {
      return ''
    }
    throw new Error(
      `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  const rawResponse = JSON.parse(res.text || '{}')

  // Validate with Zod
  const parsedResponse = Schema.parse(rawResponse)

  // If the AI determined there's no content, return empty string (don't set summary)
  if (!parsedResponse.hasContent) {
    return ''
  }

  return parsedResponse.summary
}
