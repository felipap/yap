import 'dotenv/config'
import OpenAI from 'openai'
import { z } from 'zod'

const ApiResponseSchema = z.object({
  summary: z.string(),
  hasContent: z.boolean(),
})

async function generateSummaryForTest(
  transcription: string,
  openaiApiKey: string,
) {
  const systemPrompt = `You are a helpful assistant that creates objective, factual summaries of video logs.

Create a summary that:
- Captures the main points, key topics, and important insights in 2-3 paragraphs
- Focuses on what was actually discussed, not advice or commentary
- Notes any specific people mentioned
- Highlights any concrete next steps or decisions made
- Mentions the context and mood of the recording
- Is written in third person, objective tone
- Avoids addressing the speaker directly or giving advice
- Simply reports what was said and discussed

IMPORTANT: Set hasContent to FALSE if any of these apply:
- The transcript is empty or mostly empty
- The transcript contains only gibberish, nonsense words, or speech artifacts
- The transcript is just a single short phrase or sentence with no real information
- The transcript contains only filler words, background noise transcriptions, or repeated phrases
- There is no substantive topic, discussion, or information being conveyed
- The transcript appears to be a failed or garbled transcription

Only set hasContent to TRUE if the transcript contains actual meaningful discussion, ideas, topics, or information worth summarizing.

Respond with a JSON object containing:
- "summary": string (the summary text, can be empty if hasContent is false)
- "hasContent": boolean (whether there was meaningful content worth summarizing)`

  const client = new OpenAI({ apiKey: openaiApiKey })

  const res = await client.chat.completions.create({
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

  const rawResponse = JSON.parse(res.choices[0]?.message?.content || '{}')
  return ApiResponseSchema.parse(rawResponse)
}

async function testUnsummarizableTranscript() {
  const transcript = `0:00 - 0:12 Don't stop, just keep aunqueing, that's just the way everything is.`

  console.log(`Testing transcript: "${transcript}"`)
  console.log('')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  const result = await generateSummaryForTest(transcript, apiKey)
  console.log('Result:', JSON.stringify(result, null, 2))

  if (!result.hasContent) {
    console.log('✅ Correctly identified as unsummarizable (hasContent: false)')
  } else {
    console.log('❌ Should have been marked as unsummarizable (hasContent should be false)')
    console.log('Summary returned:', result.summary)
  }
}

testUnsummarizableTranscript().catch(console.error)
