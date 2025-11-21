import { store } from '../store'

const GEMINI_API_KEY = store.get('geminiApiKey') || null

// Gemini API response types
interface GeminiError {
  error?: {
    message?: string
  }
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string
    }>
  }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

export async function generateVideoSummary(
  vlogId: string,
  transcription: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not set')
  }

  if (!transcription || transcription.trim().length === 0) {
    throw new Error('Cannot generate summary: transcription is empty')
  }

  // Get user context for personalized summaries
  const userContext = store.get('userContext') || ''

  // Build the prompt with optional user context
  const contextSection = userContext.trim()
    ? `\n\nAdditional context about the speaker:\n${userContext}`
    : ''

  // Call Gemini API to generate a proper summary
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a helpful assistant that creates objective, factual summaries of video vlogs.

Create a summary that:
- Captures the main points, key topics, and important insights in 2-3 paragraphs
- Focuses on what was actually discussed, not advice or commentary
- Notes any specific people mentioned
- Highlights any concrete next steps or decisions made
- Mentions the context and mood of the recording
- Is written in third person, objective tone
- Avoids addressing the speaker directly or giving advice
- Simply reports what was said and discussed${contextSection}

Please create an objective summary of this vlog transcript:\n\n${transcription}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
    },
  )

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as GeminiError
    throw new Error(
      `Gemini API error: ${res.status} - ${errorData.error?.message || 'Unknown error'}`,
    )
  }

  const data = (await res.json()) as GeminiResponse

  // Extract all text parts and concatenate them (in case there are multiple parts)
  const allParts = data.candidates?.[0]?.content?.parts || []
  const summary = allParts
    .map((part) => part.text || '')
    .join(' ')
    .trim()

  if (!summary) {
    throw new Error('No summary generated from Gemini API')
  }

  // Validate that the response is actually a summary, not a request for more information
  // This happens when the AI responds with a request rather than an actual summary
  const lowerSummary = summary.toLowerCase()

  // Check for patterns indicating the AI is asking for the transcript instead of providing a summary
  // Pattern 1: "I need the vlog transcript to create..."
  const isRequestingTranscript =
    (lowerSummary.includes('i need') || lowerSummary.includes('need the') || lowerSummary.includes('i require')) &&
    (lowerSummary.includes('transcript') || lowerSummary.includes('vlog transcript')) &&
    (lowerSummary.includes('to create') || lowerSummary.includes('create the') || lowerSummary.includes('create a'))

  // Pattern 2: "Please provide the transcript..."
  const isRequestingInput =
    lowerSummary.includes('please provide') &&
    (lowerSummary.includes('transcript') || lowerSummary.includes('the transcript'))

  // Pattern 3: "to create the summary you've requested" + mentions transcript
  const isAskingForMoreInfo =
    (lowerSummary.includes('to create') || lowerSummary.includes('create the summary')) &&
    (lowerSummary.includes('you\'ve requested') || lowerSummary.includes('you have requested')) &&
    lowerSummary.includes('transcript')

  // Pattern 4: "I will generate" + "based on your specifications" (indicates it's a promise, not a summary)
  const isPromisingToGenerate =
    lowerSummary.includes('i will generate') &&
    (lowerSummary.includes('based on your specifications') || lowerSummary.includes('once you provide')) &&
    lowerSummary.includes('transcript')

  if (isRequestingTranscript || isRequestingInput || isAskingForMoreInfo || isPromisingToGenerate) {
    throw new Error(
      'AI returned a request for transcript instead of a summary. The transcription may be too short or invalid.',
    )
  }

  return summary
}
