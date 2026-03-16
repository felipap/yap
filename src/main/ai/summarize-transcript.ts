import OpenAI from 'openai'
import { z } from 'zod'
import { store } from '../store'

const ApiResponseSchema = z.object({
  summary: z.string().describe('The objective summary of the log transcript'),
  hasContent: z
    .boolean()
    .describe(
      'Whether the transcript contains meaningful content to summarize',
    ),
})

const ResultSchema = z.object({
  success: z.boolean().describe('Was the summary generated successfully'),
  summary: z.string().describe('The objective summary of the log transcript'),
  hasContent: z
    .boolean()
    .describe(
      'Whether the transcript contains meaningful content to summarize',
    ),
})

export type Result = z.infer<typeof ResultSchema>

export async function generateSummary(
  transcription: string,
  openaiApiKey: string,
): Promise<Result> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is not set')
  }

  // If transcription is empty, return early
  if (!transcription || transcription.trim().length === 0) {
    return { success: false, summary: '', hasContent: false }
  }

  // Get user context for personalized summaries
  const userContext = store.get('userContext') || ''

  // Build the prompt with optional user context
  const contextSection = userContext.trim()
    ? `\n\nAdditional context about the speaker:\n${userContext}`
    : ''

  const systemPrompt = `You are a helpful assistant that creates objective, factual summaries of video logs.

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

Respond with a JSON object containing:
- "summary": string (the summary text)
- "hasContent": boolean (whether there was meaningful content)`

  const client = new OpenAI({ apiKey: openaiApiKey })

  let res
  try {
    res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Please create an objective summary of this log transcript:\n\n${transcription}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7,
    })
  } catch (error) {
    throw new Error(
      `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  const rawResponse = JSON.parse(res.choices[0]?.message?.content || '{}')

  // Validate with Zod (API response doesn't include success)
  const parsedResponse = ApiResponseSchema.parse(rawResponse)

  // If the AI determined there's no content, return empty string (don't set summary)
  if (!parsedResponse.hasContent) {
    return { success: false, summary: '', hasContent: false }
  }

  return { success: true, summary: parsedResponse.summary, hasContent: true }
}
