import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
if (!GEMINI_API_KEY) {
  throw new Error('!GEMINI_API_KEY')
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const Schema = z.object({
  day: z.number().min(1).max(31),
  month: z.number().min(1).max(12),
  year: z.number().min(1900).max(2100),
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type Result = z.infer<typeof Schema>

export async function extractDateFromTitle(
  title: string,
): Promise<Result | { error: string }> {
  const prompt = `Extract date and time from this video title: "${title}"

Look for these patterns:
- ISO dates: "2024-01-15", "2025-01-12"
- Times: "8.07 PM" (convert to 20:07), "8:07 PM" (convert to 20:07), "20:07" (keep as 20:07)
- Combined: "2025-01-12 at 8.07 PM"

Extract the date and time components separately.`

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
            day: {
              type: 'integer',
              description: 'Day of month as integer (1-31)',
            },
            month: {
              type: 'integer',
              description: 'Month as integer (1-12, where 1=January)',
            },
            year: {
              type: 'integer',
              description: 'Year as 4-digit integer (e.g., 2025)',
            },
            hour: {
              type: 'integer',
              description: 'Hour as integer (0-23 for 24-hour format)',
            },
            minute: {
              type: 'integer',
              description: 'Minute as integer (0-59)',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Confidence level of the extraction',
            },
          },
          required: ['day', 'month', 'year', 'hour', 'minute', 'confidence'],
        },
      },
    })
  } catch (error) {
    return {
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  const rawResponse = JSON.parse(res.text || '{}')

  // Validate with Zod
  const parsedResponse = Schema.parse(rawResponse)

  return {
    ...parsedResponse,
  }
}
