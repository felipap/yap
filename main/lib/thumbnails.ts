// Logic for generating thumbnails for videos. Depends on ffmpeg.

import { exec } from 'child_process'
import { createHash } from 'crypto'
import { access, mkdir } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { getCacheDir } from './config'
import { debug } from './logger'
import { findFFmpegPath, getFFmpegEnv } from './ffmpeg'
import { isFileActuallyReadable } from './file-utils'

const execAsync = promisify(exec)

// Cache directory for thumbnails
const CACHE_DIR = join(getCacheDir(), 'thumbnails')

// Track number of ongoing thumbnail generations
let activeGenerations = 0
const MAX_CONCURRENT_GENERATIONS = 10

// Cache directory initialization is handled by the centralized config

const THUMBNAIL_STRATEGIES = [
  {
    name: 'standard extraction at 1s',
    preInput: '',
    outputArgs: '-ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 2',
  },
  {
    name: 'error recovery at 1s',
    preInput: '-err_detect ignore_err',
    outputArgs: '-ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 2',
  },
  {
    name: 'extraction from beginning',
    preInput: '',
    outputArgs: '-ss 00:00:00 -vframes 1 -vf "scale=320:-1" -q:v 2',
  },
  {
    name: 'mjpeg codec at 1s',
    preInput: '',
    outputArgs: '-ss 00:00:01 -vframes 1 -vf "scale=320:-1" -c:v mjpeg -q:v 2',
  },
  {
    name: 'first frame without seeking',
    preInput: '',
    outputArgs: '-vframes 1 -vf "scale=320:-1" -q:v 2',
  },
]

export async function generateThumbnail(
  videoPath: string,
): Promise<string | null> {
  await mkdir(CACHE_DIR, { recursive: true })

  const videoHash = createHash('sha256')
    .update(videoPath)
    .digest('hex')
    .substring(0, 16)
  const thumbnailPath = join(CACHE_DIR, `${videoHash}.jpg`)

  try {
    await access(thumbnailPath)
    return thumbnailPath
  } catch {
    // Thumbnail doesn't exist, generate it below
  }

  if (activeGenerations >= MAX_CONCURRENT_GENERATIONS) {
    debug(
      `Skipping thumbnail generation - limit of ${MAX_CONCURRENT_GENERATIONS} concurrent generations reached`,
    )
    return null
  }

  const isReadable = await isFileActuallyReadable(videoPath)
  if (!isReadable) {
    debug(
      'Cannot read video file for thumbnail (may be cloud storage placeholder):',
      videoPath,
    )
    return null
  }

  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    debug('ffmpeg not available')
    return null
  }

  activeGenerations++
  debug(
    `Starting thumbnail generation (${activeGenerations}/${MAX_CONCURRENT_GENERATIONS})`,
  )

  try {
    const ffmpegEnv = getFFmpegEnv()

    for (const strategy of THUMBNAIL_STRATEGIES) {
      const pre = strategy.preInput ? ` ${strategy.preInput}` : ''
      const cmd = `"${ffmpegPath}"${pre} -i "${videoPath}" ${strategy.outputArgs} "${thumbnailPath}"`

      try {
        await execAsync(cmd, { env: ffmpegEnv })
        return thumbnailPath
      } catch {
        debug(`Thumbnail strategy "${strategy.name}" failed for: ${videoPath}`)
      }
    }

    debug('All thumbnail generation methods failed for:', videoPath)
    return null
  } finally {
    activeGenerations--
    debug(
      `Finished thumbnail generation (${activeGenerations}/${MAX_CONCURRENT_GENERATIONS})`,
    )
  }
}

// Helper function to get thumbnail path for a video file
export function getThumbnailPath(videoPath: string): string {
  const videoHash = createHash('sha256')
    .update(videoPath)
    .digest('hex')
    .substring(0, 16)
  return join(CACHE_DIR, `${videoHash}.jpg`)
}

export async function shuffleThumbnail(
  videoPath: string,
  duration: number,
): Promise<string | null> {
  await mkdir(CACHE_DIR, { recursive: true })

  const thumbnailPath = getThumbnailPath(videoPath)

  // Delete existing cached thumbnail
  const { unlink } = await import('fs/promises')
  try {
    await unlink(thumbnailPath)
  } catch {
    // File may not exist
  }

  const ffmpegPath = await findFFmpegPath()
  if (!ffmpegPath) {
    debug('ffmpeg not available')
    return null
  }

  const randomSeconds = Math.floor(Math.random() * Math.max(1, duration))
  const hours = Math.floor(randomSeconds / 3600)
  const minutes = Math.floor((randomSeconds % 3600) / 60)
  const seconds = randomSeconds % 60
  const timestamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const ffmpegEnv = getFFmpegEnv()
  const cmd = `"${ffmpegPath}" -ss ${timestamp} -i "${videoPath}" -vframes 1 -vf "scale=320:-1" -q:v 2 "${thumbnailPath}"`

  try {
    await execAsync(cmd, { env: ffmpegEnv })
    return thumbnailPath
  } catch {
    debug(`Shuffle thumbnail failed at ${timestamp}, falling back to regenerate`)
    return generateThumbnail(videoPath)
  }
}
