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
import { store } from '../store'
import { getTempDir } from './config'
import { findFFmpegPath, getFFmpegEnv, isFFmpegAvailable } from './ffmpeg'
import { isFileActuallyReadable } from './file-utils'

const OPENAI_API_KEY = store.get('openaiApiKey') || null

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

async function splitAudioIntoChunks(
  audioPath: string,
  maxSizeMB: number = 24, // Leave some margin below 25MB limit
): Promise<string[]> {
  const stats = await stat(audioPath)
  const fileSizeMB = stats.size / (1024 * 1024)

  // If file is small enough, return as-is
  if (fileSizeMB <= maxSizeMB) {
    return [audioPath]
  }

  // Calculate how many chunks we need
  const numChunks = Math.ceil(fileSizeMB / maxSizeMB)

  // Get video duration to calculate chunk duration
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
  const chunks: string[] = []

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

    chunks.push(chunkPath)
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

export async function transcribeAudio(
  audioPath: string,
  speedUp: boolean = false,
  onProgress?: (progress: number) => void,
): Promise<TranscriptionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set')
  }

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  })

  try {
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
    let currentTimeOffset = 0

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = chunks[i]
      const chunkProgress = (i / chunks.length) * 100

      // Get file size for progress estimation
      const stats = await stat(chunkPath)
      const fileSizeMB = stats.size / (1024 * 1024)

      // Verify chunk has content
      if (stats.size === 0) {
        throw new Error(`Audio chunk ${i} is empty`)
      }

      console.log(
        `Transcribing chunk ${i + 1}/${chunks.length}, size: ${fileSizeMB.toFixed(2)}MB, path: ${chunkPath}`,
      )

      // Start progress simulation for this chunk
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 10
        if (progress < 90) {
          const totalProgress = chunkProgress + progress / chunks.length
          onProgress?.(totalProgress)
        }
      }, 500)

      try {
        // Read file and create File object for OpenAI API
        const fileBuffer = await readFile(chunkPath)
        const fileName = chunkPath.split('/').pop() || 'audio.mp3'
        const file = new File([fileBuffer], fileName, { type: 'audio/mpeg' })

        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        })

        clearInterval(progressInterval)

        // Store language from first chunk
        if (!language && transcription.language) {
          language = transcription.language
        }

        // Append text
        fullText += (fullText ? ' ' : '') + transcription.text

        // Adjust timestamps and append segments
        const segments =
          transcription.segments?.map((segment) => ({
            start:
              (speedUp ? segment.start * 2 : segment.start) + currentTimeOffset,
            end: (speedUp ? segment.end * 2 : segment.end) + currentTimeOffset,
            text: segment.text,
          })) || []

        allSegments.push(...segments)

        // Update time offset for next chunk
        if (segments.length > 0) {
          currentTimeOffset = segments[segments.length - 1].end
        }
      } catch (chunkError) {
        clearInterval(progressInterval)
        console.error(`Failed to transcribe chunk ${i}:`, chunkError)
        throw new Error(
          `Failed to transcribe audio chunk ${i + 1}/${chunks.length}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'
          }`,
        )
      }

      // Clean up chunk file if it's not the original
      if (isChunked) {
        try {
          await unlink(chunkPath)
        } catch (error) {
          console.warn('Failed to delete chunk file:', error)
        }
      }
    }

    onProgress?.(100)

    return {
      text: fullText,
      segments: allSegments,
      language,
      duration:
        allSegments.length > 0 ? allSegments[allSegments.length - 1].end : 0,
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
    } catch { }
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
  } catch { }

  const tsDuration = await computeFromPackets()
  return Number.isFinite(tsDuration) ? tsDuration : 0
}
