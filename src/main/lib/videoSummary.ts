import { store, UserProfile } from '../store'

const GEMINI_API_KEY = store.get('geminiApiKey') || ''

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
  // Get user profile for personalized context
  const userProfile: UserProfile = store.get('userProfile') || {
    name: 'Felipe',
    role: 'Solo founder/entrepreneur',
    interests: ['AI', 'tech projects', 'workflow automation', 'inbox agents'],
    languages: ['English', 'Portuguese'],
    context:
      'Working on AI and tech projects, exploring business ideas, considering co-founders for certain projects',
  }

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
- Is written in third person, objective tone using the speaker's name (${userProfile.name})
- Avoids addressing the speaker directly or giving advice
- Simply reports what was said and discussed

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
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!summary) {
    throw new Error('No summary generated from Gemini API')
  }

  return summary
}
