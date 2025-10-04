import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { access, mkdir, readFile, unlink } from 'fs/promises'
import { createReadStream } from 'fs'
import { OpenAI } from 'openai'
import { homedir } from 'os'
import { join } from 'path'
import { store } from '../store'

const OPENAI_API_KEY = store.get('openaiApiKey') || ''
if (!OPENAI_API_KEY) {
  throw new Error('!OPENAI_API_KEY')
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language?: string
  duration: number
}

export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version'])
    ffmpeg.on('error', () => resolve(false))
    ffmpeg.on('close', (code) => resolve(code === 0))
  })
}

export async function extractAudioFromVideo(
  videoPath: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const isAvailable = await checkFFmpegAvailable()
  if (!isAvailable) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  const tempDir = join(homedir(), 'Documents', 'VlogRecordings', 'temp')
  await mkdir(tempDir, { recursive: true })

  const hash = createHash('md5')
    .update(videoPath + (speedUp ? '-2x' : ''))
    .digest('hex')
  const audioPath = join(tempDir, `${hash}.wav`)

  // Check if audio already exists
  try {
    await access(audioPath)
    return audioPath
  } catch {
    // Audio doesn't exist, extract it
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      videoPath,
      '-vn', // No video
      '-acodec',
      'pcm_s16le', // 16-bit PCM
      '-ar',
      '16000', // 16kHz sample rate (good for speech)
      '-ac',
      '1', // Mono
    ]

    // Add speed-up filter if requested
    if (speedUp) {
      args.push('-filter:a', 'atempo=2.0') // 2x speed
    }

    args.push('-y', audioPath) // Overwrite

    const ffmpeg = spawn('ffmpeg', args)

    let errorOutput = ''
    let duration = 0

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString()
      errorOutput += output

      // Parse duration from FFmpeg output
      if (!duration) {
        const durationMatch = output.match(
          /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/,
        )
        if (durationMatch) {
          const hours = parseInt(durationMatch[1], 10)
          const minutes = parseInt(durationMatch[2], 10)
          const seconds = parseFloat(durationMatch[3])
          duration = hours * 3600 + minutes * 60 + seconds
        }
      }

      // Parse progress from FFmpeg output
      const progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
      if (progressMatch && duration > 0) {
        const hours = parseInt(progressMatch[1], 10)
        const minutes = parseInt(progressMatch[2], 10)
        const seconds = parseFloat(progressMatch[3])
        const currentTime = hours * 3600 + minutes * 60 + seconds
        const progress = Math.min((currentTime / duration) * 100, 100)
        onProgress?.(progress)
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve(audioPath)
      } else {
        reject(new Error(`FFmpeg audio extraction failed: ${errorOutput}`))
      }
    })

    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`))
    })
  })
}

export async function transcribeAudio(
  audioPath: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<TranscriptionResult> {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  })

  try {
    // Get file size for progress estimation
    const { stat } = await import('fs/promises')
    const stats = await stat(audioPath)
    const fileSizeMB = stats.size / (1024 * 1024)

    // Estimate processing time (roughly 1 second per MB for Whisper)
    const estimatedProcessingTime = fileSizeMB * 1000

    // Start progress simulation
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += Math.random() * 10 // Random progress increment
      if (progress < 90) {
        // Don't go above 90% until actual completion
        onProgress?.(progress)
      }
    }, 500)

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    // Clear progress interval and set to 100%
    clearInterval(progressInterval)
    onProgress?.(100)

    const segments =
      transcription.segments?.map((segment) => ({
        start: speedUp ? segment.start * 2 : segment.start, // Adjust timestamps back to real time
        end: speedUp ? segment.end * 2 : segment.end,
        text: segment.text,
      })) || []

    return {
      text: transcription.text,
      segments,
      language: transcription.language,
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
    }
  } catch (error) {
    console.error('OpenAI transcription error:', error)
    throw new Error(
      `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export async function transcribeVideo(
  videoPath: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<TranscriptionResult> {
  try {
    // Extract audio from video (0-50% progress)
    const audioPath = await extractAudioFromVideo(
      videoPath,
      speedUp,
      (progress) => {
        onProgress?.(progress * 0.5) // Audio extraction is 50% of total progress
      },
    )

    // Transcribe the audio (50-100% progress)
    const result = await transcribeAudio(audioPath, speedUp, (progress) => {
      onProgress?.(50 + progress * 0.5) // Audio transcription is remaining 50%
    })

    // Clean up temporary audio file
    try {
      await unlink(audioPath)
    } catch (error) {
      console.warn('Failed to delete temporary audio file:', error)
    }

    return result
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const isAvailable = await checkFFmpegAvailable()
  if (!isAvailable) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      videoPath,
    ])

    let output = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output)
          const duration = parseFloat(data.format.duration)
          resolve(duration)
        } catch (error) {
          reject(new Error('Failed to parse video duration'))
        }
      } else {
        reject(new Error('Failed to get video duration'))
      }
    })

    ffprobe.on('error', (error) => {
      reject(new Error(`Failed to start ffprobe: ${error.message}`))
    })
  })
}
