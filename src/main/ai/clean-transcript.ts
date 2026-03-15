import { GoogleGenAI } from '@google/genai'
import type { TranscriptionResult } from '../../shared-types'

export async function cleanTranscript(
  result: TranscriptionResult,
  geminiApiKey: string,
): Promise<TranscriptionResult> {
  if (!geminiApiKey || result.segments.length === 0) {
    return result
  }

  const texts = result.segments.map((s) => s.text)

  const prompt = `You are a transcript editor. Clean up these spoken transcript segments:

- Remove filler words: "um", "uh", "umm", "aaaaand", "aaand", "like" (filler), "you know", stuttered/repeated words. Same for Portuguese: "tipo", "assim", "né", "enfim", "é" (filler), "aí", "então" (filler), etc.
- Compress rambling or repetitive parts into tighter versions that preserve the meaning.
- Fix broken grammar from speech (abandoned clauses, false starts).
- Keep the speaker's voice, tone, and all substantive content.
- If a segment becomes empty after cleaning, return an empty string.

Return a JSON array of strings, one per input segment, in the same order.

Input segments:
${JSON.stringify(texts)}`

  const client = new GoogleGenAI({ apiKey: geminiApiKey })

  const res = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: { type: 'string' },
      },
      temperature: 0.1,
    },
  })

  const cleaned: string[] = JSON.parse(res.text || '[]')

  if (cleaned.length !== result.segments.length) {
    console.warn(
      `Transcript cleaning: got ${cleaned.length} results for ${result.segments.length} segments, skipping`,
    )
    return result
  }

  const cleanedSegments = result.segments.map((seg, i) => ({
    ...seg,
    text: cleaned[i],
  }))

  return {
    ...result,
    segments: cleanedSegments,
    text: cleanedSegments.map((s) => s.text).join(' '),
  }
}
