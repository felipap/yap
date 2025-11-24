import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { access, mkdir, readFile, stat, unlink } from 'fs/promises'
import { File } from 'node:buffer'
import { OpenAI } from 'openai'
import { join } from 'path'
import type {
  TranscriptionResult,
  TranscriptionSegment,
} from '../../shared-types'
import { getTempDir } from './config'
import { findFFmpegPath, getFFmpegEnv, isFFmpegAvailable } from './ffmpeg'
import { isFileActuallyReadable } from './file-utils'

export async function extractAudioFromVideo(
  videoPath: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const isAvailable = await isFFmpegAvailable()
  if (!isAvailable) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  const tempDir = getTempDir()
  await mkdir(tempDir, { recursive: true })

  const hash = createHash('md5')
    .update(videoPath + (speedUp ? '-2x' : ''))
    .digest('hex')
  const audioPath = join(tempDir, `${hash}.mp3`)

  // Check if audio already exists
  try {
    await access(audioPath)
    console.log(`Using cached audio file: ${audioPath}`)
    return audioPath
  } catch {
    // Audio doesn't exist, extract it
  }

  // Check if source video file is actually readable
  const isReadable = await isFileActuallyReadable(videoPath)
  if (!isReadable) {
    throw new Error(
      `Cannot read video file for audio extraction: ${videoPath}. This file appears to be in cloud storage (Google Drive, Dropbox, etc.) and is not fully downloaded locally. Please ensure the file is available offline before processing.`,
    )
  }

  console.log(`Extracting audio from video: ${videoPath}`)

  // Get video duration for validation
  let videoDuration: number | null = null
  try {
    videoDuration = await getVideoDuration(videoPath)
  } catch (error) {
    console.warn('Could not get video duration for validation:', error)
  }

  await new Promise<void>((resolve, reject) => {
    const args = [
      '-i',
      videoPath,
      '-vn', // No video
      '-acodec',
      'libmp3lame', // MP3 codec for better compression
      '-ar',
      '16000', // 16kHz sample rate (good for speech)
      '-ac',
      '1', // Mono
      '-b:a',
      '32k', // 32kbps bitrate (sufficient for speech)
    ]

    // Add speed-up filter if requested
    if (speedUp) {
      args.push('-filter:a', 'atempo=2.0') // 2x speed
    }

    args.push('-y', audioPath) // Overwrite

    const ffmpeg = spawn(ffmpegPath, args, {
      env: getFFmpegEnv(),
    })

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
        resolve()
      } else {
        reject(new Error(`FFmpeg audio extraction failed: ${errorOutput}`))
      }
    })

    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`))
    })
  })

  // Verify the extracted file exists and has content
  const stats = await stat(audioPath)
  if (stats.size === 0) {
    throw new Error(
      'Audio extraction created an empty file. The video may not have an audio track.',
    )
  }

  console.log(
    `Audio extracted successfully: ${audioPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`,
  )

  // Validate duration matches video
  if (videoDuration !== null && videoDuration > 0) {
    try {
      const audioDuration = await getAudioDuration(audioPath)
      const expectedDuration = speedUp ? videoDuration / 2 : videoDuration
      const diff = Math.abs(audioDuration - expectedDuration)
      if (diff > expectedDuration * 0.02) {
        console.warn(
          `Audio duration mismatch: video ${(videoDuration / 60).toFixed(1)}min, audio ${(audioDuration / 60).toFixed(1)}min, expected ${(expectedDuration / 60).toFixed(1)}min`,
        )
      }
    } catch {
      // Ignore validation errors
    }
  }

  return audioPath
}

interface AudioChunk {
  path: string
  startTime: number
}

async function splitAudioIntoChunks(
  audioPath: string,
  maxSizeMB: number = 24, // Leave some margin below 25MB limit
): Promise<AudioChunk[]> {
  const stats = await stat(audioPath)
  const fileSizeMB = stats.size / (1024 * 1024)

  // If file is small enough, return as-is
  if (fileSizeMB <= maxSizeMB) {
    return [{ path: audioPath, startTime: 0 }]
  }

  // Calculate how many chunks we need
  const numChunks = Math.ceil(fileSizeMB / maxSizeMB)

  // Get audio duration to calculate chunk duration
  const duration = await getAudioDuration(audioPath)
  const chunkDuration = Math.ceil(duration / numChunks)

  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  const tempDir = getTempDir()
  await mkdir(tempDir, { recursive: true })

  const hash = createHash('md5')
    .update(audioPath + Date.now())
    .digest('hex')
  const chunks: AudioChunk[] = []

  // Split the audio into chunks
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration
    const chunkPath = join(tempDir, `${hash}_chunk_${i}.mp3`)

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-i',
        audioPath,
        '-ss',
        startTime.toString(),
        '-t',
        chunkDuration.toString(),
        '-acodec',
        'libmp3lame',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-b:a',
        '32k',
        '-y',
        chunkPath,
      ]

      const ffmpeg = spawn(ffmpegPath, args, {
        env: getFFmpegEnv(),
      })
      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg chunk splitting failed: ${errorOutput}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`))
      })
    })

    chunks.push({ path: chunkPath, startTime })
  }

  return chunks
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      audioPath,
    ]

    const child = spawn('ffprobe', args)
    let output = ''

    child.stdout.on('data', (data) => {
      output += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output)
          const duration = parseFloat(data?.format?.duration || '0')
          resolve(duration)
        } catch {
          reject(new Error('Failed to parse ffprobe output'))
        }
      } else {
        reject(new Error('ffprobe exited with error'))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

interface ChunkTranscriptionResult {
  segments: TranscriptionSegment[]
  text: string
  language?: string
}

async function transcribeAudioChunk(
  chunk: AudioChunk,
  openai: OpenAI,
  speedUp: boolean,
  chunkIndex: number,
  totalChunks: number,
  shouldCleanup: boolean,
): Promise<ChunkTranscriptionResult> {
  const chunkPath = chunk.path
  const chunkStartTime = chunk.startTime

  // Get file size for logging
  const stats = await stat(chunkPath)
  const fileSizeMB = stats.size / (1024 * 1024)

  // Verify chunk has content
  if (stats.size === 0) {
    throw new Error(`Audio chunk ${chunkIndex} is empty`)
  }

  console.log(
    `Transcribing chunk ${chunkIndex + 1}/${totalChunks}, size: ${fileSizeMB.toFixed(2)}MB, start time: ${chunkStartTime.toFixed(1)}s`,
  )

  // Read file and create File object for OpenAI API
  const fileBuffer = await readFile(chunkPath)
  const fileName = chunkPath.split('/').pop() || 'audio.mp3'
  const file = new File([fileBuffer], fileName, { type: 'audio/mpeg' })

  let transcription
  try {
    transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
  } catch (chunkError) {
    console.error(`Failed to transcribe chunk ${chunkIndex}:`, chunkError)
    throw new Error(
      `Failed to transcribe audio chunk ${chunkIndex + 1}/${totalChunks}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`,
    )
  }

  // Adjust timestamps: if audio was already sped up during extraction,
  // Whisper returns timestamps relative to the sped-up audio.
  // We need to map them back to the original video timeline by multiplying by 2.
  // chunkStartTime is in sped-up audio time, so it also needs to be multiplied.
  const segments =
    transcription.segments?.map((segment) => {
      const segmentStart = segment.start + chunkStartTime
      const segmentEnd = segment.end + chunkStartTime
      return {
        start: speedUp ? segmentStart * 2 : segmentStart,
        end: speedUp ? segmentEnd * 2 : segmentEnd,
        text: segment.text,
      }
    }) || []

  // Clean up chunk file if it's not the original
  if (shouldCleanup) {
    try {
      await unlink(chunkPath)
    } catch (error) {
      console.warn('Failed to delete chunk file:', error)
    }
  }

  return {
    segments,
    text: transcription.text,
    language: transcription.language,
  }
}

export async function transcribeAudio(
  audioPath: string,
  openaiApiKey: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<TranscriptionResult> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is not set')
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  // Verify the audio file exists and has content
  const audioStats = await stat(audioPath)
  if (audioStats.size === 0) {
    throw new Error(
      'Extracted audio file is empty. The video may not have an audio track.',
    )
  }

  // Split audio into chunks if needed
  const chunks = await splitAudioIntoChunks(audioPath)
  const isChunked = chunks.length > 1

  const allSegments: TranscriptionSegment[] = []
  let fullText = ''
  let language: string | undefined

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunkProgress = (i / chunks.length) * 100

    // Report progress at start of chunk
    onProgress?.(chunkProgress)

    const chunkResult = await transcribeAudioChunk(
      chunks[i],
      openai,
      speedUp,
      i,
      chunks.length,
      isChunked,
    )

    // Store language from first chunk
    if (!language && chunkResult.language) {
      language = chunkResult.language
    }

    // Append text with space separator
    fullText += (fullText ? ' ' : '') + chunkResult.text

    // Append segments
    allSegments.push(...chunkResult.segments)

    // Report progress after chunk completion
    onProgress?.(((i + 1) / chunks.length) * 100)
  }

  onProgress?.(100)

  return {
    text: fullText,
    segments: allSegments,
    language,
    duration:
      allSegments.length > 0 ? allSegments[allSegments.length - 1].end : 0,
  }
}

export async function transcribeVideo(
  videoPath: string,
  openaiApiKey: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<TranscriptionResult> {
  let audioPath: string
  try {
    // Extract audio from video (0-50% progress)
    audioPath = await extractAudioFromVideo(videoPath, speedUp, (progress) => {
      onProgress?.(progress * 0.5) // Audio extraction is 50% of total progress
    })
  } catch (error) {
    throw new Error(
      `Failed to extract audio from video: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  let result: TranscriptionResult
  try {
    // Transcribe the audio (50-100% progress)
    result = await transcribeAudio(
      audioPath,
      openaiApiKey,
      speedUp,
      (progress) => {
        onProgress?.(50 + progress * 0.5) // Audio transcription is remaining 50%
      },
    )
  } finally {
    // Clean up temporary audio file (failure shouldn't fail the whole operation)
    try {
      await unlink(audioPath)
    } catch (error) {
      console.warn('Failed to delete temporary audio file:', error)
    }
  }
  return result
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const isAvailable = await isFFmpegAvailable()
  if (!isAvailable) {
    throw new Error('FFmpeg not installed. Install with: brew install ffmpeg')
  }

  // Check if source video file is actually readable
  const isReadable = await isFileActuallyReadable(videoPath)
  if (!isReadable) {
    throw new Error(
      `Cannot read video file for duration check: ${videoPath}. This file appears to be in cloud storage (Google Drive, Dropbox, etc.) and is not fully downloaded locally. Please ensure the file is available offline before processing.`,
    )
  }

  // Helper: run ffprobe and parse JSON
  const runProbe = (args: string[]): Promise<any> =>
    new Promise((resolve, reject) => {
      const child = spawn('ffprobe', args)
      let out = ''
      child.stdout.on('data', (d) => {
        out += d.toString()
      })
      child.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(out))
          } catch {
            reject(new Error('Failed to parse ffprobe JSON'))
          }
        } else {
          reject(new Error('ffprobe exited with error'))
        }
      })
      child.on('error', (err) => reject(err))
    })

  const parseHms = (hms: string): number => {
    const parts = hms.split(':')
    if (parts.length === 3) {
      const [hh, mm, ss] = parts
      return parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60 + parseFloat(ss)
    }
    if (parts.length === 2) {
      const [mm, ss] = parts
      return parseInt(mm, 10) * 60 + parseFloat(ss)
    }
    const asNum = parseFloat(hms)
    return isFinite(asNum) ? asNum : 0
  }

  const parseFromFormat = (data: any): number => {
    const d = Number.parseFloat(data?.format?.duration)
    if (Number.isFinite(d) && d > 0) {
      return d
    }
    const tag = data?.format?.tags?.DURATION || data?.format?.tags?.duration
    if (typeof tag === 'string') {
      const d2 = parseHms(tag)
      if (Number.isFinite(d2) && d2 > 0) {
        return d2
      }
    }
    return 0
  }

  const parseFromStreams = (data: any): number => {
    let best = 0
    const streams = Array.isArray(data?.streams) ? data.streams : []
    for (const s of streams) {
      const d1 = Number.parseFloat(s?.duration)
      if (Number.isFinite(d1) && d1 > best) {
        best = d1
      }
      const tagDur = s?.tags?.DURATION || s?.tags?.duration
      if (typeof tagDur === 'string') {
        const d2 = parseHms(tagDur)
        if (Number.isFinite(d2) && d2 > best) {
          best = d2
        }
      }
      if (
        typeof s?.duration_ts === 'number' &&
        typeof s?.time_base === 'string'
      ) {
        const [num, den] = s.time_base.split('/').map((x: string) => Number(x))
        if (num && den) {
          const d3 = (s.duration_ts * num) / den
          if (Number.isFinite(d3) && d3 > best) {
            best = d3
          }
        }
      }
      if (
        typeof s?.nb_frames !== 'undefined' &&
        typeof s?.avg_frame_rate === 'string' &&
        s.avg_frame_rate !== '0/0'
      ) {
        const frames = Number(s.nb_frames)
        const [n, d] = s.avg_frame_rate.split('/').map((x: string) => Number(x))
        if (Number.isFinite(frames) && n && d) {
          const fps = n / d
          if (fps > 0) {
            const d4 = frames / fps
            if (Number.isFinite(d4) && d4 > best) {
              best = d4
            }
          }
        }
      }
    }
    return best
  }

  const computeFromPackets = async (): Promise<number> => {
    try {
      // Try audio first (more continuous timestamps)
      const audio = await runProbe([
        '-v',
        'error',
        '-show_packets',
        '-select_streams',
        'a:0',
        '-print_format',
        'json',
        '-read_intervals',
        '%+#999999',
        videoPath,
      ])
      const aPackets = Array.isArray(audio?.packets) ? audio.packets : []
      let aMax = 0
      for (const p of aPackets) {
        const t = Number.parseFloat(p?.pts_time)
        if (Number.isFinite(t) && t > aMax) {
          aMax = t
        }
      }
      if (aMax > 0) {
        return aMax
      }
    } catch {}
    try {
      // Fallback to video stream packets
      const video = await runProbe([
        '-v',
        'error',
        '-show_packets',
        '-select_streams',
        'v:0',
        '-print_format',
        'json',
        '-read_intervals',
        '%+#999999',
        videoPath,
      ])
      const vPackets = Array.isArray(video?.packets) ? video.packets : []
      let vMax = 0
      for (const p of vPackets) {
        const t = Number.parseFloat(p?.pts_time)
        if (Number.isFinite(t) && t > vMax) {
          vMax = t
        }
      }
      return vMax > 0 ? vMax : 0
    } catch {
      return 0
    }
  }

  try {
    const data = await runProbe([
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      videoPath,
    ])
    let duration = parseFromFormat(data)
    if (!Number.isFinite(duration) || duration <= 0) {
      duration = parseFromStreams(data)
    }
    if (Number.isFinite(duration) && duration > 0) {
      return duration
    }
  } catch {}

  const tsDuration = await computeFromPackets()
  return Number.isFinite(tsDuration) ? tsDuration : 0
}
