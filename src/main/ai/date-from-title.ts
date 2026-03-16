import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenaiApiKey } from '../store'

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
  const openaiApiKey = getOpenaiApiKey()
  if (!openaiApiKey) {
    return { error: 'OpenAI API key is not set' }
  }

  const client = new OpenAI({ apiKey: openaiApiKey })

  const prompt = `Extract date and time from this video title: "${title}"

Look for these patterns:
- ISO dates: "2024-01-15", "2025-01-12"
- Times: "8.07 PM" (convert to 20:07), "8:07 PM" (convert to 20:07), "20:07" (keep as 20:07)
- Combined: "2025-01-12 at 8.07 PM"

Extract the date and time components separately.

Respond with a JSON object containing:
- "day": integer (1-31)
- "month": integer (1-12, where 1=January)
- "year": integer (4-digit year)
- "hour": integer (0-23 for 24-hour format)
- "minute": integer (0-59)
- "confidence": "high" | "medium" | "low"`

  let res
  try {
    res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
  } catch (error) {
    return {
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  const rawResponse = JSON.parse(res.choices[0]?.message?.content || '{}')

  // Validate with Zod
  const parsedResponse = Schema.parse(rawResponse)

  return {
    ...parsedResponse,
  }
}
