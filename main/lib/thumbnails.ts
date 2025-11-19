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

// Helper function to generate thumbnail for a video file
export async function generateThumbnail(
  videoPath: string,
): Promise<string | null> {
  try {
    // Ensure cache directory exists
    await mkdir(CACHE_DIR, { recursive: true })

    // Generate a unique filename based on video path hash
    const videoHash = createHash('sha256')
      .update(videoPath)
      .digest('hex')
      .substring(0, 16)
    const thumbnailPath = join(CACHE_DIR, `${videoHash}.jpg`)

    // Check if thumbnail already exists
    try {
      await access(thumbnailPath)
      return thumbnailPath
    } catch {
      // Thumbnail doesn't exist, generate it
    }

    // Check if we're already at the concurrent generation limit
    if (activeGenerations >= MAX_CONCURRENT_GENERATIONS) {
      debug(
        `Skipping thumbnail generation - limit of ${MAX_CONCURRENT_GENERATIONS} concurrent generations reached`,
      )
      return null
    }

    // Increment counter at the start of generation
    activeGenerations++
    debug(`Starting thumbnail generation (${activeGenerations}/${MAX_CONCURRENT_GENERATIONS})`)

    try {
      // Check if source video file is actually readable
      const isReadable = await isFileActuallyReadable(videoPath)
      if (!isReadable) {
        debug(
          'Cannot read video file for thumbnail (may be cloud storage placeholder):',
          videoPath,
        )
        return null
      }

      // Get ffmpeg path
      const ffmpegPath = await findFFmpegPath()
      if (!ffmpegPath) {
        console.log('ffmpeg not available')
        return null
      }

      const ffmpegEnv = getFFmpegEnv()

      // Try to use ffmpeg if available
      try {
        await execAsync(
          `"${ffmpegPath}" -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 2 "${thumbnailPath}"`,
          { env: ffmpegEnv },
        )
        return thumbnailPath
      } catch (ffmpegError) {
        if (
          ffmpegError instanceof Error &&
          'stderr' in ffmpegError &&
          (ffmpegError.stderr as string).includes('command not found')
        ) {
          console.log('ffmpeg not available, trying alternative method')
        } else {
          console.log('FFmpeg failed for video:', videoPath)
          console.log('Error details:', ffmpegError)

          // Try with different ffmpeg options for corrupted files
          try {
            console.log('Trying ffmpeg with error recovery options...')
            await execAsync(
              `"${ffmpegPath}" -err_detect ignore_err -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -q:v 2 "${thumbnailPath}"`,
              { env: ffmpegEnv },
            )
            return thumbnailPath
          } catch (recoveryError) {
            console.log(
              'FFmpeg recovery also failed, trying alternative approach...',
            )
          }
        }
      }

      // Fallback: try different approaches for corrupted files
      try {
        // Try extracting from the very beginning (frame 0) which is more likely to work
        console.log('Trying to extract frame from beginning of video...')
        await execAsync(
          `"${ffmpegPath}" -i "${videoPath}" -ss 00:00:00 -vframes 1 -vf "scale=320:-1" -q:v 2 "${thumbnailPath}"`,
          { env: ffmpegEnv },
        )
        return thumbnailPath
      } catch (beginningError) {
        console.log(
          'Beginning frame extraction failed, trying with different codec options...',
        )

        // Try with different codec options
        try {
          await execAsync(
            `"${ffmpegPath}" -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" -c:v mjpeg -q:v 2 "${thumbnailPath}"`,
            { env: ffmpegEnv },
          )
          return thumbnailPath
        } catch (codecError) {
          console.log(
            'Codec-specific extraction failed, trying final fallback...',
          )

          // Final fallback: try without seeking (just take first frame)
          try {
            await execAsync(
              `"${ffmpegPath}" -i "${videoPath}" -vframes 1 -vf "scale=320:-1" -q:v 2 "${thumbnailPath}"`,
              { env: ffmpegEnv },
            )
            return thumbnailPath
          } catch (finalError) {
            console.log('All thumbnail generation methods failed for:', videoPath)
            console.log('Final error:', finalError)
          }
        }
      }

      return null
    } finally {
      // Always decrement counter when generation completes
      activeGenerations--
      debug(`Finished thumbnail generation (${activeGenerations}/${MAX_CONCURRENT_GENERATIONS})`)
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return null
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
