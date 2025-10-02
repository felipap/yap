import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
if (!GEMINI_API_KEY) {
  throw new Error('!GEMINI_API_KEY')
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const Schema = z.object({
  date: z.string().nullable().optional(),
  day: z.number().min(1).max(31).nullable().optional(),
  month: z.number().min(1).max(12).nullable().optional(),
  year: z.number().min(1900).max(2100).nullable().optional(),
  hour: z.number().min(0).max(23).nullable().optional(),
  minute: z.number().min(0).max(59).nullable().optional(),
  ampm: z.enum(['AM', 'PM']).nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('low'),
  extractedText: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional()
})

export type Result = z.infer<typeof Schema>

export async function extractDateFromTitle(title: string): Promise<Result> {
  const prompt = `
Extract date and time from this video title. Look for formats like:
- "2024-01-15" (ISO format)
- "2024-01-15T10-30-00" (ISO with time)
- "2024_01_15" (underscore separated)
- "20240115" (compact format)
- "January 15, 2024" (natural language)
- "15/01/2024" or "01/15/2024" (slash separated)
- "8.07 PM" or "8:07 PM" (time formats)
- "2024-01" (year-month only)
`


  let res
  try {
    res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            date: { type: "string", nullable: true },
            day: { type: "integer", nullable: true },
            month: { type: "integer", nullable: true },
            year: { type: "integer", nullable: true },
            hour: { type: "integer", nullable: true },
            minute: { type: "integer", nullable: true },
            ampm: { type: "string", enum: ["AM", "PM"], nullable: true },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            extractedText: { type: "string", nullable: true },
            reasoning: { type: "string", nullable: true }
          },
          required: ["confidence"]
            status: {
              type: "string",
              enum: ["active", "pending", "suspended"], // Enums actually work!
            },
          },
          required: ["email", "status"],
        }
      },
      // response_format: { type: "json_object", schema: jsonSchema },
    })
  } catch (error) {
    return {
      date: null,
      confidence: 'low',
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  console.log('res.text', res.text)

  const rawResponse = JSON.parse(res.text || '{}')

  // Validate with Zod
  const parsedResponse = Schema.parse(rawResponse)


  return {
    ...parsedResponse,
  }
}

